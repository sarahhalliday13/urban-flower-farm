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
  const [isExportingMaster, setIsExportingMaster] = useState(false);
  
  // Import state
  const [plantsFile, setPlantsFile] = useState(null);
  const [importStatus, setImportStatus] = useState({ loading: false, message: '' });
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importMode, setImportMode] = useState('smart'); // Always use smart mode for unified database
  
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

  // Export current database as master spreadsheet
  const handleExportMasterSpreadsheet = async () => {
    try {
      setIsExportingMaster(true);
      
      // Fetch current plants and inventory from Firebase
      const { database } = await import('../services/firebase');
      const { ref, get } = await import('firebase/database');
      
      const plantsSnapshot = await get(ref(database, 'plants'));
      const inventorySnapshot = await get(ref(database, 'inventory'));
      
      const plants = plantsSnapshot.exists() ? plantsSnapshot.val() : {};
      const inventory = inventorySnapshot.exists() ? inventorySnapshot.val() : {};
      
      // Prepare data for spreadsheet
      const rows = [];
      
      // Process each plant
      Object.entries(plants).forEach(([plantId, plant]) => {
        const inventoryData = inventory[plantId] || {};
        
        // Create row with all plant and inventory data
        const row = {
          // Core fields
          'plant_id': plantId,
          'update_mode': '', // Empty by default, user will fill this
          
          // Plant data
          'name': plant.name || '',
          'latinname': plant.scientificName || '',
          'commonname': plant.commonName || '',
          'price': plant.price || 0,
          'featured': plant.featured ? 'TRUE' : 'FALSE',
          'type': plant.plantType || '',
          'description': plant.description || '',
          'bloom_season': plant.bloomSeason || '',
          'colour': plant.colour || '',
          'sunlight': plant.light || '',
          'spread_inches': plant.spread || '',
          'height_inches': plant.height || '',
          'hardiness_zones': plant.hardinessZone || '',
          'special_features': plant.specialFeatures || '',
          'uses': plant.uses || '',
          'aroma': plant.aroma || '',
          'gardening_tips': plant.gardeningTips || '',
          'care_tips': plant.careTips || '',
          'planting_season': plant.plantingSeason || '',
          'planting_depth_inches': plant.plantingDepth || '',
          'mature_size': plant.size || '',
          'hidden': plant.hidden ? 'TRUE' : 'FALSE',
          
          // Inventory data
          'current_stock': inventoryData.inventoryCount || 0,
          'status': inventoryData.status || 'active',
          'restock_date': inventoryData.restockDate || '',
          'notes': inventoryData.notes || '',
          
          // Images
          'mainimage': plant.mainImage || '',
          'additionalimage': plant.additionalImages || ''
        };
        
        // Add photo credit fields for main image
        if (plant.imageMetadata && plant.mainImage) {
          const mainKey = plant.mainImage.replace(/[.#$\[\]/]/g, '_');
          const mainMeta = plant.imageMetadata[mainKey];
          if (mainMeta) {
            row['main_credit_type'] = mainMeta.type || '';
            if (mainMeta.type === 'commercial' && mainMeta.source) {
              row['main_credit_source'] = mainMeta.source.name || '';
              row['main_credit_url'] = mainMeta.source.url || '';
            } else if (mainMeta.type === 'own') {
              row['main_credit_photographer'] = mainMeta.photographer || '';
              row['main_credit_watermarked'] = mainMeta.watermarked ? 'YES' : 'NO';
            }
          }
        }
        
        // Add photo credit fields for additional images (up to 3)
        if (plant.additionalImages && plant.imageMetadata) {
          const additionalUrls = plant.additionalImages.split(',').map(url => url.trim()).filter(url => url);
          additionalUrls.slice(0, 3).forEach((url, index) => {
            const imgKey = url.replace(/[.#$\[\]/]/g, '_');
            const imgMeta = plant.imageMetadata[imgKey];
            if (imgMeta) {
              const prefix = `add${index + 1}_credit_`;
              row[prefix + 'type'] = imgMeta.type || '';
              if (imgMeta.type === 'commercial' && imgMeta.source) {
                row[prefix + 'source'] = imgMeta.source.name || '';
                row[prefix + 'url'] = imgMeta.source.url || '';
              } else if (imgMeta.type === 'own') {
                row[prefix + 'photographer'] = imgMeta.photographer || '';
                row[prefix + 'watermarked'] = imgMeta.watermarked ? 'YES' : 'NO';
              }
            }
          });
        }
        
        rows.push(row);
      });
      
      // Sort by plant_id
      rows.sort((a, b) => parseInt(a.plant_id) - parseInt(b.plant_id));
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create main data sheet
      const ws = XLSX.utils.json_to_sheet(rows);
      
      // Set column widths
      const cols = [
        { wch: 10 }, // plant_id
        { wch: 15 }, // update_mode
        { wch: 30 }, // name
        { wch: 30 }, // latinname
        { wch: 20 }, // commonname
        { wch: 10 }, // price
        { wch: 10 }, // featured
        { wch: 15 }, // type
        { wch: 50 }, // description
        { wch: 15 }, // bloom_season
        { wch: 15 }, // colour
        { wch: 15 }, // sunlight
        { wch: 15 }, // spread_inches
        { wch: 15 }, // height_inches
        { wch: 15 }, // hardiness_zones
        { wch: 30 }, // special_features
        { wch: 20 }, // uses
        { wch: 15 }, // aroma
        { wch: 30 }, // gardening_tips
        { wch: 30 }, // care_tips
        { wch: 15 }, // planting_season
        { wch: 15 }, // planting_depth_inches
        { wch: 15 }, // mature_size
        { wch: 10 }, // hidden
        { wch: 15 }, // current_stock
        { wch: 15 }, // status
        { wch: 15 }, // restock_date
        { wch: 30 }, // notes
        { wch: 50 }, // mainimage
        { wch: 50 }  // additionalimage
      ];
      ws['!cols'] = cols;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Database');
      
      // Create instructions sheet
      const instructions = [
        { 'Instructions': 'HOW TO USE THIS MASTER DATABASE SPREADSHEET' },
        { 'Instructions': '' },
        { 'Instructions': '1. UPDATING THE DATABASE:' },
        { 'Instructions': '   - Make any changes to plant data, prices, inventory, etc.' },
        { 'Instructions': '   - Use the update_mode column to control what happens to each plant:' },
        { 'Instructions': '     • Leave blank or "update_existing" = Update the plant data' },
        { 'Instructions': '     • "add_new" = Add as new plant (only if plant_id doesn\'t exist)' },
        { 'Instructions': '     • "archive" = Hide the plant (preserves order history)' },
        { 'Instructions': '' },
        { 'Instructions': '2. ADDING NEW PLANTS:' },
        { 'Instructions': '   - Add new rows at the bottom' },
        { 'Instructions': '   - Use new plant_id numbers (check existing highest number)' },
        { 'Instructions': '   - Set update_mode to "add_new"' },
        { 'Instructions': '' },
        { 'Instructions': '3. INVENTORY STATUS OPTIONS:' },
        { 'Instructions': '   - "active" = Currently available' },
        { 'Instructions': '   - "coming_soon" = Future availability' },
        { 'Instructions': '   - "discontinued" = No longer available' },
        { 'Instructions': '' },
        { 'Instructions': '4. PHOTO CREDITS:' },
        { 'Instructions': '   - main_credit_type: "own" or "commercial"' },
        { 'Instructions': '   - For commercial: provide source name and URL' },
        { 'Instructions': '   - For own photos: optionally add photographer and watermark info' },
        { 'Instructions': '' },
        { 'Instructions': '5. IMPORTANT NOTES:' },
        { 'Instructions': '   - Do NOT change plant_id for existing plants' },
        { 'Instructions': '   - Order history is preserved when updating or archiving' },
        { 'Instructions': '   - Upload this file in the Import section when ready' }
      ];
      
      const wsInstructions = XLSX.utils.json_to_sheet(instructions, { header: ['Instructions'] });
      wsInstructions['!cols'] = [{ wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
      
      // Generate filename with date
      const date = new Date().toISOString().split('T')[0];
      const filename = `master_database_${date}.xlsx`;
      
      // Download the file
      XLSX.writeFile(wb, filename);
      
      addToast(`Master database exported: ${rows.length} plants`, 'success');
    } catch (error) {
      console.error('Error exporting master spreadsheet:', error);
      addToast('Failed to export master spreadsheet', 'error');
    } finally {
      setIsExportingMaster(false);
    }
  };

  // Process Master Database
  const handleGeneratePreview = async (e) => {
    e.preventDefault();
    
    if (!plantsFile) {
      setImportStatus({ loading: false, message: 'Please select a master database file' });
      return;
    }
    
    try {
      setImportStatus({ loading: true, message: 'Reading master database...' });
      
      // Read master database file
      const masterData = await readFile(plantsFile);
      
      // Analyze the data to provide a summary
      let addCount = 0;
      let updateCount = 0;
      let archiveCount = 0;
      
      masterData.forEach(row => {
        const mode = row.update_mode ? row.update_mode.toLowerCase() : 'update_existing';
        if (mode === 'add_new') addCount++;
        else if (mode === 'archive') archiveCount++;
        else updateCount++; // Default to update
      });
      
      // Transform for preview (showing first 10 with their actions)
      const previewRows = masterData.slice(0, 10).map(row => ({
        id: parseInt(row.plant_id) || 0,
        name: row.name || '',
        price: parseFloat(String(row.price || 0).replace(/[$,]/g, '')) || 0,
        stock: parseInt(row.current_stock || 0),
        action: row.update_mode || 'update_existing',
        mainImage: row.mainimage || ''
      }));
      
      // Store full data for actual import
      setPreviewData({
        masterData: masterData,
        preview: previewRows,
        summary: {
          total: masterData.length,
          add: addCount,
          update: updateCount,
          archive: archiveCount
        }
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
        // Support both old format (photo_credit_*) and new format (main_credit_*, add1_credit_*, etc.)
        plantData.imageMetadata = {};
        
        // Handle main image credits
        const mainImage = plantData.mainImage;
        if (mainImage) {
          const mainCreditType = plant.main_credit_type || plant.photo_credit_type;
          if (mainCreditType && mainCreditType.toLowerCase() !== 'none') {
            const safeKey = createSafeKey(mainImage);
            plantData.imageMetadata[safeKey] = {
              type: mainCreditType.toLowerCase()
            };

            const mainSource = plant.main_credit_source || plant.photo_credit_source;
            const mainPhotographer = plant.main_credit_photographer || plant.photo_credit_photographer;
            const mainWatermarked = plant.main_credit_watermarked || plant.photo_credit_watermarked;

            if (mainCreditType.toLowerCase() === 'commercial' && mainSource) {
              plantData.imageMetadata[safeKey].source = {
                name: mainSource,
                url: plant.main_credit_url || plant.photo_credit_url || ''
              };
            } else if (mainCreditType.toLowerCase() === 'own') {
              if (mainPhotographer) {
                plantData.imageMetadata[safeKey].photographer = mainPhotographer;
              }
              if (mainWatermarked === 'true' || 
                  mainWatermarked === 'TRUE' || 
                  mainWatermarked === 'YES' ||
                  mainWatermarked === true) {
                plantData.imageMetadata[safeKey].watermarked = true;
              }
            }
          }
        }
        
        // Handle additional images and their credits
        // Process additionalImages string (comma-separated) or individual columns
        let additionalImageUrls = [];
        
        // Check for comma-separated additionalImages
        if (plantData.additionalImages) {
          additionalImageUrls = plantData.additionalImages.split(',').map(url => url.trim()).filter(url => url);
        }
        
        // Also check for individual additional image columns
        for (let i = 1; i <= 3; i++) {
          const imgUrl = plant[`additionalimage${i}`];
          if (imgUrl && imgUrl.trim()) {
            additionalImageUrls.push(imgUrl.trim());
            
            // Process credits for this additional image
            const creditType = plant[`add${i}_credit_type`];
            if (creditType && creditType.toLowerCase() !== 'none') {
              const safeKey = createSafeKey(imgUrl);
              plantData.imageMetadata[safeKey] = {
                type: creditType.toLowerCase()
              };
              
              const source = plant[`add${i}_credit_source`];
              const photographer = plant[`add${i}_credit_photographer`];
              const watermarked = plant[`add${i}_credit_watermarked`];
              
              if (creditType.toLowerCase() === 'commercial' && source) {
                plantData.imageMetadata[safeKey].source = {
                  name: source,
                  url: plant[`add${i}_credit_url`] || ''
                };
              } else if (creditType.toLowerCase() === 'own') {
                if (photographer) {
                  plantData.imageMetadata[safeKey].photographer = photographer;
                }
                if (watermarked === 'true' || 
                    watermarked === 'TRUE' || 
                    watermarked === 'YES' ||
                    watermarked === true) {
                  plantData.imageMetadata[safeKey].watermarked = true;
                }
              }
            }
          }
        }
        
        // Update additionalImages if we found any
        if (additionalImageUrls.length > 0) {
          plantData.additionalImages = additionalImageUrls.join(',');
        }
        
        // Clean up imageMetadata if empty
        if (Object.keys(plantData.imageMetadata).length === 0) {
          delete plantData.imageMetadata;
        }

        return plantData;
      });
      
      // Transform inventory data from the same rows
      const transformedInventoryData = previewData.masterData ? 
        previewData.masterData.map(row => ({
          plantId: row.plant_id,
          inventoryCount: parseInt(row.current_stock || 0),
          status: row.status || 'active',
          restockDate: row.restock_date || '',
          notes: row.notes || ''
        })) : 
        previewData.inventory || [];
      
      setImportStatus({ loading: true, message: `Processing ${transformedPlantsData.length} plants...` });
      
      // Use smart mode for master database, otherwise use selected mode
      const effectiveMode = previewData.masterData ? 'smart' : importMode;
      const result = await importPlantsFromSheets(transformedPlantsData, transformedInventoryData, effectiveMode);
      
      if (result.success) {
        setImportStatus({ 
          loading: false, 
          message: result.message,
          success: true
        });
        addToast(result.message, 'success');
        // Reset form
        setPlantsFile(null);
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
          📤 Import / Update
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
            
            <div className="action-box" style={{marginTop: '20px'}}>
              <button 
                onClick={handleExportMasterSpreadsheet}
                disabled={isExportingMaster}
                className="primary-button large"
                style={{backgroundColor: '#28a745'}}
              >
                {isExportingMaster ? 'Exporting Database...' : '📊 Download Master Database Spreadsheet'}
              </button>
              <p className="help-text">
                Downloads an Excel file with all plants and inventory for editing and re-import
              </p>
            </div>
          </div>
        )}
        
        {/* Import / Update Tab */}
        {activeTab === 'import' && (
          <div className="import-section">
            <div className="info-boxes-row">
              {/* Database Status & Import Info */}
              <div className="info-box info">
                <h3>📊 Database Status</h3>
                {availableIds && (
                  <>
                    <p>You have <strong>{availableIds.totalPlants} plants</strong> in your database</p>
                    <p><strong>Next ID:</strong> {availableIds.highestUsed + 1} for new plants</p>
                  </>
                )}
                <hr className="info-divider" />
                <p className="small-text"><strong>HOW IT WORKS:</strong></p>
                <ol style={{fontSize: '12px', marginTop: '5px', paddingLeft: '20px'}}>
                  <li>Export your current database using the button on the Export tab</li>
                  <li>Edit the spreadsheet (prices, inventory, add new plants, etc.)</li>
                  <li>Use the update_mode column to control each row's action</li>
                  <li>Upload the modified spreadsheet here</li>
                </ol>
              </div>
              
              {/* Import Instructions */}
              <div className="info-box template">
                <h3>📝 Update Mode Options</h3>
                <p style={{fontSize: '13px', marginBottom: '10px'}}>Use the <strong>update_mode</strong> column to control each plant:</p>
                <ul style={{fontSize: '12px', paddingLeft: '20px', marginTop: '5px'}}>
                  <li><strong>Leave blank or "update_existing":</strong> Updates the plant</li>
                  <li><strong>"add_new":</strong> Adds as new plant (if ID doesn't exist)</li>
                  <li><strong>"archive":</strong> Hides the plant (preserves orders)</li>
                </ul>
                <hr className="info-divider" />
                <p style={{fontSize: '11px', color: '#6c757d'}}>
                  💡 Tip: Export first, make changes, then re-import
                </p>
              </div>
            </div>
            
            {/* Unified Database Upload */}
            <form onSubmit={handleGeneratePreview}>
              <div className="form-group">
                <h4>📊 Master Database File</h4>
                <p className="help-text">
                  Upload your edited master database spreadsheet (.xlsx, .xls, or .csv)
                </p>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setPlantsFile(e.target.files[0])}
                    className="file-input"
                    id="master-file"
                  />
                  <label htmlFor="master-file" className="file-label">
                    {plantsFile ? plantsFile.name : 'No file chosen'}
                  </label>
                  <button type="button" className="select-button" onClick={() => document.getElementById('master-file').click()}>
                    Select File
                  </button>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={importStatus.loading || !plantsFile}
                className="primary-button"
                style={{marginTop: '20px'}}
              >
                {importStatus.loading ? 'Processing...' : '🚀 Process Database Update'}
              </button>
            </form>
            
            {/* Preview Modal */}
            {showPreview && previewData && (
              <div className="preview-modal">
                <div className="preview-content">
                  <h3>Database Update Preview</h3>
                  
                  {/* Action Summary */}
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{marginTop: 0, marginBottom: '10px'}}>📊 Summary of Actions</h4>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px'}}>
                      <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: '24px', fontWeight: 'bold', color: '#28a745'}}>
                          {previewData.summary.add}
                        </div>
                        <div style={{fontSize: '12px', color: '#6c757d'}}>To Add</div>
                      </div>
                      <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: '24px', fontWeight: 'bold', color: '#007bff'}}>
                          {previewData.summary.update}
                        </div>
                        <div style={{fontSize: '12px', color: '#6c757d'}}>To Update</div>
                      </div>
                      <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: '24px', fontWeight: 'bold', color: '#dc3545'}}>
                          {previewData.summary.archive}
                        </div>
                        <div style={{fontSize: '12px', color: '#6c757d'}}>To Archive</div>
                      </div>
                    </div>
                  </div>
                  
                  <p>Showing first {Math.min(10, previewData.preview.length)} of {previewData.summary.total} plants:</p>
                  
                  <div className="preview-table">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.preview.map((plant, index) => (
                          <tr key={index}>
                            <td>{plant.id}</td>
                            <td>{plant.name}</td>
                            <td>${plant.price}</td>
                            <td>{plant.stock}</td>
                            <td>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                backgroundColor: 
                                  plant.action === 'add_new' ? '#d4edda' :
                                  plant.action === 'archive' ? '#f8d7da' :
                                  '#cce5ff',
                                color:
                                  plant.action === 'add_new' ? '#155724' :
                                  plant.action === 'archive' ? '#721c24' :
                                  '#004085'
                              }}>
                                {plant.action === 'add_new' ? 'ADD' :
                                 plant.action === 'archive' ? 'ARCHIVE' :
                                 'UPDATE'}
                              </span>
                            </td>
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
        
      </div>
      
      {/* CSV Format Reference - only show on import tab */}
      {activeTab === 'import' && (
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