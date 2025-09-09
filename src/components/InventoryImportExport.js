import React, { useState, useEffect } from 'react';
import { downloadBackup, importPlantsFromSheets, updateInventoryStock, getAvailablePlantIds } from '../services/firebase';
import { useToast } from '../context/ToastContext';
import * as XLSX from 'xlsx';
import '../styles/InventoryImportExport.css';

const InventoryImportExport = () => {
  const [activeTab, setActiveTab] = useState('export');
  const { addToast } = useToast();
  
  // Export/Backup state
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  // Import Plants state
  const [plantsFile, setPlantsFile] = useState(null);
  const [inventoryFile, setInventoryFile] = useState(null);
  const [importStatus, setImportStatus] = useState({ loading: false, message: '' });
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Update Inventory state
  const [updateFile, setUpdateFile] = useState(null);
  const [updateStatus, setUpdateStatus] = useState({ loading: false, message: '' });
  
  // Available IDs state
  const [availableIds, setAvailableIds] = useState(null);
  const [loadingIds, setLoadingIds] = useState(false);

  // Helper function to parse CSV
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('CSV file is empty');
    
    const headers = lines[0].split(',').map(header => 
      header.trim().toLowerCase().replace(/["']/g, '')
    );
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      let line = lines[i];
      const values = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim().replace(/^"|"$/g, ''));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      values.push(currentValue.trim().replace(/^"|"$/g, ''));
      
      if (values.length === headers.length) {
        const obj = {};
        headers.forEach((header, index) => {
          if (header) obj[header] = values[index];
        });
        data.push(obj);
      }
    }
    
    return data;
  };

  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // Check file extension to determine parsing method
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      reader.onload = (event) => {
        try {
          let parsedData;
          
          if (isExcel) {
            // Parse Excel file
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON with lowercase headers
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              raw: false,
              defval: '' 
            });
            
            // Convert headers to lowercase to match CSV parsing
            parsedData = jsonData.map(row => {
              const lowercaseRow = {};
              Object.keys(row).forEach(key => {
                lowercaseRow[key.toLowerCase().replace(/["']/g, '')] = row[key];
              });
              return lowercaseRow;
            });
          } else {
            // Parse CSV file
            const csvText = event.target.result;
            parsedData = parseCSV(csvText);
          }
          
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Error reading file'));
      
      // Read as ArrayBuffer for Excel, as text for CSV
      if (isExcel) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Export/Backup handler
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await downloadBackup();
      if (result.success) {
        addToast(`Backup downloaded! ${result.stats.plants} plants, ${result.stats.inventory} inventory items, ${result.stats.orders} orders`, 'success');
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Backup error:', error);
      addToast('Failed to create backup', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Generate preview data
  const handleGeneratePreview = async (e) => {
    e.preventDefault();
    
    if (!plantsFile) {
      setImportStatus({ loading: false, message: 'Please select a plants CSV file' });
      return;
    }
    
    try {
      setImportStatus({ loading: true, message: 'Reading files...' });
      
      // Read plants data
      const plantsData = await readFile(plantsFile);
      
      // Read inventory data if provided
      let inventoryData = [];
      if (inventoryFile) {
        inventoryData = await readFile(inventoryFile);
      }
      
      // Transform plant data for preview
      const transformedPlantsData = plantsData.map(plant => ({
        id: parseInt(plant.plant_id) || 0,
        name: plant.name || '',
        price: parseFloat(String(plant.price || 0).replace(/[$,]/g, '')) || 0,
        mainImage: plant.mainimage || plant.main_image || '',
        inventoryCount: 0 // Will be updated from inventory data
      }));
      
      // Add inventory counts if available
      if (inventoryData.length > 0) {
        inventoryData.forEach(item => {
          const plant = transformedPlantsData.find(p => p.id.toString() === item.plant_id);
          if (plant) {
            plant.inventoryCount = parseInt(item.current_stock || item.stock || 0);
          }
        });
      }
      
      // Store full data for actual import
      setPreviewData({
        plants: plantsData,
        inventory: inventoryData,
        preview: transformedPlantsData.slice(0, 10) // Show first 10 items
      });
      
      setShowPreview(true);
      setImportStatus({ loading: false, message: '' });
    } catch (error) {
      console.error('Preview error:', error);
      setImportStatus({ 
        loading: false, 
        message: `Error reading files: ${error.message}`,
        error: true
      });
    }
  };

  // Import Plants handler (after preview confirmation)
  const handleConfirmImport = async () => {
    if (!previewData) return;
    
    try {
      setImportStatus({ loading: true, message: 'Processing import...' });
      
      // Helper to create safe Firebase key from URL
      const createSafeKey = (url) => {
        if (!url) return '';
        return url.replace(/[.#$\[\]/]/g, '_');
      };

      // Transform plant data
      const transformedPlantsData = previewData.plants.map(plant => {
        const plantData = {
          id: parseInt(plant.plant_id) || 0,
          name: plant.name || '',
          scientificName: plant.latinname || '',
          commonName: plant.commonname || '',
          price: parseFloat(String(plant.price || 0).replace(/[$,]/g, '')) || 0,
          featured: plant.featured === 'true',
          plantType: plant.type || '',
          description: plant.description || '',
          bloomSeason: plant.bloom_season || '',
          colour: plant.colour || plant.color || '',
          light: plant.sunlight || '',
          spread: plant.spread_inches || '',
          height: plant.height_inches || '',
          hardinessZone: plant.hardiness_zones || '',
          specialFeatures: plant.special_features || '',
          uses: plant.uses || '',
          aroma: plant.aroma || '',
          gardeningTips: plant.gardening_tips || '',
          careTips: plant.care_tips || '',
          mainImage: plant.mainimage || plant.main_image || '',
          additionalImages: plant.additionalimage || plant.additional_image || '',
          plantingSeason: plant.planting_season || '',
          plantingDepth: plant.planting_depth_inches || plant.planting_depth || '',
          size: plant.mature_size || plant.size || '',
          hidden: plant.hidden === 'true' || plant.hidden === true || plant.hidden === 'TRUE'
        };

        // Process photo credit metadata if provided
        if (plant.photo_credit_type) {
          const mainImage = plantData.mainImage;
          if (mainImage) {
            const safeKey = createSafeKey(mainImage);
            plantData.imageMetadata = {
              [safeKey]: {
                type: plant.photo_credit_type.toLowerCase()
              }
            };

            if (plant.photo_credit_type.toLowerCase() === 'commercial' && plant.photo_credit_source) {
              plantData.imageMetadata[safeKey].source = {
                name: plant.photo_credit_source,
                url: plant.photo_credit_url || ''
              };
            } else if (plant.photo_credit_type.toLowerCase() === 'own') {
              if (plant.photo_credit_photographer) {
                plantData.imageMetadata[safeKey].photographer = plant.photo_credit_photographer;
              }
              if (plant.photo_credit_watermarked === 'true' || 
                  plant.photo_credit_watermarked === 'TRUE' || 
                  plant.photo_credit_watermarked === 'YES' ||
                  plant.photo_credit_watermarked === true) {
                plantData.imageMetadata[safeKey].watermarked = true;
              }
            }
          }
        }

        return plantData;
      });
      
      setImportStatus({ loading: true, message: `Importing ${transformedPlantsData.length} plants...` });
      
      const result = await importPlantsFromSheets(transformedPlantsData, previewData.inventory);
      
      if (result.success) {
        setImportStatus({ 
          loading: false, 
          message: `Success! Added ${result.plantsCount} new plants. ${result.skippedCount > 0 ? `(${result.skippedCount} existing plants preserved)` : ''}`,
          success: true
        });
        addToast(result.message, 'success');
        // Reset form
        setPlantsFile(null);
        setInventoryFile(null);
        setPreviewData(null);
        setShowPreview(false);
        // Refresh available IDs
        setAvailableIds(null);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({ 
        loading: false, 
        message: `Error: ${error.message}`,
        error: true
      });
      addToast(error.message, 'error');
    }
  };

  // Update Inventory handler
  const handleUpdateInventory = async (e) => {
    e.preventDefault();
    
    if (!updateFile) {
      setUpdateStatus({ loading: false, message: 'Please select an inventory CSV file' });
      return;
    }
    
    try {
      setUpdateStatus({ loading: true, message: 'Reading inventory file...' });
      
      const inventoryData = await readFile(updateFile);
      
      setUpdateStatus({ loading: true, message: `Updating ${inventoryData.length} inventory records...` });
      
      const result = await updateInventoryStock(inventoryData);
      
      if (result.success) {
        setUpdateStatus({ 
          loading: false, 
          message: result.message,
          success: true
        });
        addToast(result.message, 'success');
        setUpdateFile(null);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Update error:', error);
      setUpdateStatus({ 
        loading: false, 
        message: `Error: ${error.message}`,
        error: true
      });
      addToast(error.message, 'error');
    }
  };

  // Load available IDs when on import tab
  useEffect(() => {
    if (activeTab === 'import' && !availableIds && !loadingIds) {
      setLoadingIds(true);
      getAvailablePlantIds()
        .then(data => {
          setAvailableIds(data);
          setLoadingIds(false);
        })
        .catch(error => {
          console.error('Error loading available IDs:', error);
          setLoadingIds(false);
        });
    }
  }, [activeTab, availableIds, loadingIds]);

  return (
    <div className="inventory-import-export">
      <h1>Inventory Import & Export</h1>
      <p className="subtitle">Manage bulk operations for your plant inventory</p>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📥 Export / Backup
        </button>
        <button 
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📤 Import New Plants
        </button>
        <button 
          className={`tab ${activeTab === 'update' ? 'active' : ''}`}
          onClick={() => setActiveTab('update')}
        >
          🔄 Update Stock Levels
        </button>
      </div>
      
      <div className="tab-content">
        {/* Export/Backup Tab */}
        {activeTab === 'export' && (
          <div className="export-section">
            <div className="info-box success">
              <h3>🛡️ Protect Your Data</h3>
              <p>Download a complete backup of your plants, inventory, and orders.</p>
              <p className="tip">💡 Tip: Create a backup before any major changes!</p>
            </div>
            
            <div className="action-box">
              <button 
                onClick={handleBackup}
                disabled={isBackingUp}
                className="primary-button large"
              >
                {isBackingUp ? 'Creating Backup...' : '📥 Download Full Backup'}
              </button>
              <p className="help-text">
                Downloads a JSON file with all your data that can be used for recovery
              </p>
            </div>
          </div>
        )}
        
        {/* Import New Plants Tab */}
        {activeTab === 'import' && (
          <div className="import-section">
            <div className="info-boxes-row">
              {/* Database Status & Import Info */}
              <div className="info-box info">
                <h3>📊 Database Status</h3>
                {availableIds && (
                  <>
                    <p>You have <strong>{availableIds.totalPlants} plants</strong> in your database</p>
                    <p><strong>Next ID:</strong> {availableIds.highestUsed + 1} • <strong>Suggested Range:</strong> {availableIds.highestUsed + 1} - {availableIds.highestUsed + 10}</p>
                  </>
                )}
                <hr className="info-divider" />
                <p className="small-text"><strong>Import Mode:</strong> Add-only • Skips existing • Preview first</p>
              </div>
              
              {/* Template Download */}
              <div className="info-box template">
                <h3>📄 Excel Template</h3>
                <p>Get the correct format for easy importing:</p>
                <a 
                  href="/templates/plants_inventory_v2.xlsx" 
                  download="plants_inventory_template_v2.xlsx"
                  className="template-download-link"
                >
                  📥 Download Template (with Photo Credits)
                </a>
              </div>
            </div>
            
            <form onSubmit={handleGeneratePreview}>
              <div className="form-group">
                <h4>📋 Plants File (Required)</h4>
                <p className="help-text">
                  Accepts Excel (.xlsx, .xls) or CSV files. Should include: plant_id, name, price, mainimage, etc.
                </p>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setPlantsFile(e.target.files[0])}
                    className="file-input"
                    id="plants-file"
                  />
                  <label htmlFor="plants-file" className="file-label">
                    {plantsFile ? plantsFile.name : 'No file chosen'}
                  </label>
                  <button type="button" className="select-button" onClick={() => document.getElementById('plants-file').click()}>
                    Select
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <h4>📦 Inventory File (Optional)</h4>
                <p className="help-text">
                  Accepts Excel (.xlsx, .xls) or CSV files. Should include: plant_id, current_stock, status
                </p>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setInventoryFile(e.target.files[0])}
                    className="file-input"
                    id="inventory-file"
                  />
                  <label htmlFor="inventory-file" className="file-label">
                    {inventoryFile ? inventoryFile.name : 'No file chosen'}
                  </label>
                  <button type="button" className="select-button" onClick={() => document.getElementById('inventory-file').click()}>
                    Select
                  </button>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={importStatus.loading || !plantsFile}
                className="primary-button"
              >
                {importStatus.loading ? 'Loading...' : 'Preview Import'}
              </button>
            </form>
            
            {/* Preview Modal */}
            {showPreview && previewData && (
              <div className="preview-modal">
                <div className="preview-content">
                  <h3>Import Preview</h3>
                  <p>Found {previewData.plants.length} plants to import. Showing first {Math.min(10, previewData.plants.length)}:</p>
                  
                  <div className="preview-table">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Image</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.preview.map((plant, index) => (
                          <tr key={index}>
                            <td>{plant.id}</td>
                            <td>{plant.name}</td>
                            <td>${plant.price}</td>
                            <td>{plant.inventoryCount}</td>
                            <td>{plant.mainImage ? '✓' : '✗'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="preview-actions">
                    <button 
                      onClick={handleConfirmImport}
                      disabled={importStatus.loading}
                      className="primary-button"
                    >
                      {importStatus.loading ? 'Importing...' : 'Confirm Import'}
                    </button>
                    <button 
                      onClick={() => {
                        setShowPreview(false);
                        setPreviewData(null);
                        setImportStatus({ loading: false, message: '' });
                      }}
                      className="secondary-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {importStatus.message && (
              <div className={`status-message ${importStatus.error ? 'error' : importStatus.success ? 'success' : ''}`}>
                {importStatus.message}
              </div>
            )}
          </div>
        )}
        
        {/* Update Inventory Tab */}
        {activeTab === 'update' && (
          <div className="update-section">
            <div className="info-box info">
              <h3>🔄 Update Stock Levels</h3>
              <p>Update inventory quantities for existing plants only.</p>
              <p>Use this after importing plants to set their stock levels.</p>
            </div>
            
            <form onSubmit={handleUpdateInventory}>
              <div className="form-group">
                <h4>📊 Inventory File</h4>
                <p className="help-text">
                  Accepts Excel (.xlsx, .xls) or CSV files. Should include: plant_id, current_stock (or stock/quantity)
                </p>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setUpdateFile(e.target.files[0])}
                    className="file-input"
                    id="update-file"
                  />
                  <label htmlFor="update-file" className="file-label">
                    {updateFile ? updateFile.name : 'No file chosen'}
                  </label>
                  <button type="button" className="select-button" onClick={() => document.getElementById('update-file').click()}>
                    Select
                  </button>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={updateStatus.loading || !updateFile}
                className="primary-button"
              >
                {updateStatus.loading ? 'Updating...' : 'Update Stock Levels'}
              </button>
            </form>
            
            {updateStatus.message && (
              <div className={`status-message ${updateStatus.error ? 'error' : updateStatus.success ? 'success' : ''}`}>
                {updateStatus.message}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* CSV Format Reference - only show on import/update tabs */}
      {activeTab !== 'export' && (
        <div className="format-reference">
          <h3>📋 CSV Format Reference</h3>
          <div className="format-grid">
            <div className="format-box">
              <h4>Plants CSV</h4>
              <code>
                plant_id, name, latinname, price, mainimage, type, description...
              </code>
              <div style={{marginTop: '8px', fontSize: '12px'}}>
                <strong>Photo Credit Fields (optional):</strong><br/>
                <code style={{fontSize: '11px'}}>
                  photo_credit_type (own/commercial)<br/>
                  photo_credit_source (e.g., Van Noort, Jelitto)<br/>
                  photo_credit_photographer (for own photos)<br/>
                  photo_credit_watermarked (YES/NO)<br/>
                  photo_credit_url (source website)
                </code>
              </div>
            </div>
            <div className="format-box">
              <h4>Inventory CSV</h4>
              <code>
                plant_id, current_stock, status, restock_date, notes
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryImportExport;