import React, { useState, useEffect } from 'react';
import { downloadBackup, importPlantsFromSheets, updateInventoryStock, getAvailablePlantIds, database } from '../services/firebase';
import { ref, get } from 'firebase/database';
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
      const plantsSnapshot = await get(ref(database, 'plants'));
      const inventorySnapshot = await get(ref(database, 'inventory'));
      
      const plants = plantsSnapshot.exists() ? plantsSnapshot.val() : {};
      const inventory = inventorySnapshot.exists() ? inventorySnapshot.val() : {};
      
      // Debug inventory structure
      console.log('Inventory data sample:', Object.keys(inventory).slice(0, 5).map(key => ({
        key,
        data: inventory[key]
      })));
      
      // Prepare data for spreadsheet
      const rows = [];
      
      // Process each plant
      Object.entries(plants).forEach(([plantId, plant]) => {
        const inventoryData = inventory[plantId] || {};
        
        // Debug: Check if we're getting inventory data
        if (plantId === '1' || plantId === '2') {
          console.log(`Inventory for plant ${plantId}:`, inventoryData);
        }
        
        // Debug plant 46 specifically
        if (plantId === '46') {
          console.log('Plant 46 full data:', plant);
          console.log('Plant 46 additionalImages:', plant.additionalImages);
          console.log('Plant 46 imageMetadata:', plant.imageMetadata);
        }
        
        // Create row with all plant and inventory data
        const row = {
          // Core fields
          'plant_id': plantId,
          'update_mode': '', // Empty by default, shows dropdown when clicked
          
          // Plant data
          'name': plant.name || '',
          'latinname': plant.scientificName || '',
          'commonname': plant.commonName || '',
          'price': plant.price || 0,
          'featured': plant.featured ? 'true' : 'false',
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
          'hidden': plant.hidden ? 'true' : 'false',
          
          // Inventory data
          'current_stock': inventoryData.currentStock || 0,
          'status': inventoryData.status || 'active',
          'restock_date': inventoryData.restockDate || '',
          'notes': inventoryData.notes || '',
          
          // Images
          'mainimage': plant.mainImage || ''
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
              row['main_credit_source'] = 'Buttons Flower Farm';
              row['main_credit_url'] = '';
            } else {
              row['main_credit_source'] = '';
              row['main_credit_url'] = '';
            }
          } else {
            // No metadata for main image - default to own
            row['main_credit_type'] = 'own';
            row['main_credit_source'] = 'Buttons Flower Farm';
            row['main_credit_url'] = '';
          }
        } else {
          // No main image or no metadata at all
          row['main_credit_type'] = '';
          row['main_credit_source'] = '';
          row['main_credit_url'] = '';
        }
        
        // Extract additional images - they might be in imageMetadata
        let additionalUrls = [];
        
        if (plant.imageMetadata) {
          // Get all image URLs from metadata except the main image
          const mainImageKey = plant.mainImage ? plant.mainImage.replace(/[.#$\[\]/]/g, '_') : null;
          
          Object.keys(plant.imageMetadata).forEach(key => {
            // Skip if this is the main image
            if (key !== mainImageKey) {
              // The key is the mangled URL - we need to store it as is for now
              // We'll reconstruct the actual URL from the metadata
              additionalUrls.push(key);
            }
          });
          
          // Debug log
          if (plantId === '46') {
            console.log(`Plant ${plantId} mainImageKey:`, mainImageKey);
            console.log(`Plant ${plantId} additional image keys:`, additionalUrls);
          }
        } else if (plant.additionalImages) {
          // Fall back to additionalImages field if it exists
          if (Array.isArray(plant.additionalImages)) {
            additionalUrls = plant.additionalImages.filter(url => url);
          } else if (typeof plant.additionalImages === 'string') {
            additionalUrls = plant.additionalImages.split(',').map(url => url.trim()).filter(url => url);
          }
        }
          
          // Add up to 3 additional image URLs in separate columns
          for (let i = 0; i < 3; i++) {
            if (additionalUrls[i]) {
              // If we have a key from imageMetadata, get the metadata and reconstruct URL
              const imgKey = additionalUrls[i];
              const imgMeta = plant.imageMetadata ? plant.imageMetadata[imgKey] : null;
              
              // Try to reconstruct the URL from the key
              // The key format is like: https:__firebasestorage_googleapis_com_v0_b_buttonsflowerfarm-8a54d...
              let reconstructedUrl = imgKey
                .replace(/^https:__/, 'https://')
                .replace(/_/g, '.')
                .replace(/\.com\./, '.com/')
                .replace(/\.app\./, '.app/')
                .replace(/\.\./g, '_'); // Fix any double dots that might have been created
              
              // Clean up the URL - remove everything after the first valid image extension
              const match = reconstructedUrl.match(/(.*?\.(jpg|jpeg|png|gif|webp))/i);
              if (match) {
                reconstructedUrl = match[1];
              }
              
              row[`additionalimage${i + 1}`] = reconstructedUrl;
              
              if (imgMeta) {
                const prefix = `add${i + 1}_credit_`;
                row[prefix + 'type'] = imgMeta.type || '';
                if (imgMeta.type === 'commercial' && imgMeta.source) {
                  row[prefix + 'source'] = imgMeta.source.name || '';
                  row[prefix + 'url'] = imgMeta.source.url || '';
                } else if (imgMeta.type === 'own') {
                  row[prefix + 'source'] = 'Buttons Flower Farm';
                  row[prefix + 'url'] = '';
                } else {
                  // Initialize empty credit fields
                  row[prefix + 'type'] = '';
                  row[prefix + 'source'] = '';
                  row[prefix + 'url'] = '';
                }
              } else {
                // No metadata for this image - default to own
                const prefix = `add${i + 1}_credit_`;
                row[prefix + 'type'] = 'own';
                row[prefix + 'source'] = 'Buttons Flower Farm';
                row[prefix + 'url'] = '';
              }
            } else {
              // No image in this slot - initialize empty fields
              row[`additionalimage${i + 1}`] = '';
              const prefix = `add${i + 1}_credit_`;
              row[prefix + 'type'] = '';
              row[prefix + 'source'] = '';
              row[prefix + 'url'] = '';
            }
          }
        
        // Debug: log if this plant has imageMetadata
        if (plant.imageMetadata && Object.keys(plant.imageMetadata).length > 0) {
          console.log(`Plant ${plantId} has imageMetadata:`, plant.imageMetadata);
        }
        
        rows.push(row);
      });
      
      // Sort by plant_id - handle both numeric and string IDs (like gift certificates)
      rows.sort((a, b) => {
        const aId = a.plant_id;
        const bId = b.plant_id;
        
        // If both are numeric, sort numerically
        const aNum = parseInt(aId);
        const bNum = parseInt(bId);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        
        // If one is numeric and one is not, numeric comes first
        if (!isNaN(aNum) && isNaN(bNum)) return -1;
        if (isNaN(aNum) && !isNaN(bNum)) return 1;
        
        // If both are strings, sort alphabetically
        return aId.localeCompare(bId);
      });
      
      // Debug: Log a sample row to see what data we have
      if (rows.length > 0) {
        console.log('Sample row with photo credits:', rows[0]);
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create main data sheet
      const ws = XLSX.utils.json_to_sheet(rows);
      
      // Format plant_id column (column A) as numbers
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let row = 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 }); // Column A
        if (ws[cellAddress] && ws[cellAddress].v) {
          ws[cellAddress].t = 'n'; // Set type to number
          ws[cellAddress].v = parseInt(ws[cellAddress].v); // Ensure it's an integer
          ws[cellAddress].z = '0'; // Number format with no decimals
        }
      }
      
      // Add data validation for update_mode column (column B)
      // Create a validation list that Excel will recognize
      const validationRange = `B2:B${rows.length + 1}`;
      if (!ws['!dataValidation']) {
        ws['!dataValidation'] = [];
      }
      
      ws['!dataValidation'].push({
        type: 'list',
        allowBlank: true,
        sqref: validationRange,
        formula1: '"add,update,hide"'
      });
      
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
        { wch: 50 }, // additionalimage1
        { wch: 50 }, // additionalimage2
        { wch: 50 }, // additionalimage3
        { wch: 15 }, // main_credit_type
        { wch: 25 }, // main_credit_source
        { wch: 40 }, // main_credit_url
        { wch: 15 }, // add1_credit_type
        { wch: 25 }, // add1_credit_source
        { wch: 40 }, // add1_credit_url
        { wch: 15 }, // add2_credit_type
        { wch: 25 }, // add2_credit_source
        { wch: 40 }, // add2_credit_url
        { wch: 15 }, // add3_credit_type
        { wch: 25 }, // add3_credit_source
        { wch: 40 }  // add3_credit_url
      ];
      ws['!cols'] = cols;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Database');
      
      // Create instructions sheet
      const instructions = [
        { 'Instructions': 'HOW TO USE THIS MASTER DATABASE SPREADSHEET' },
        { 'Instructions': '' },
        { 'Instructions': '1. UPDATING THE DATABASE:' },
        { 'Instructions': '   - Make any changes to plant data, prices, inventory, etc.' },
        { 'Instructions': '   - Use the update_mode column (click cell to see dropdown) to control what happens to each plant:' },
        { 'Instructions': '     • Leave blank or "update" = Update the plant data (respects hidden column value)' },
        { 'Instructions': '     • "add" = Add as new plant (only if plant_id doesn\'t exist)' },
        { 'Instructions': '     • "hide" = Hide plant AND update data (forces hidden to TRUE, ignores hidden column)' },
        { 'Instructions': '' },
        { 'Instructions': '2. ADDING NEW PLANTS:' },
        { 'Instructions': '   - Add new rows at the bottom' },
        { 'Instructions': '   - Use new plant_id numbers (check existing highest number)' },
        { 'Instructions': '   - Set update_mode to "add"' },
        { 'Instructions': '' },
        { 'Instructions': '3. INVENTORY STATUS OPTIONS:' },
        { 'Instructions': '   - "In Stock" = Currently available for purchase' },
        { 'Instructions': '   - "Coming Soon" = Future availability' },
        { 'Instructions': '   - "Pre-Order" = Available for advance ordering' },
        { 'Instructions': '   - "Sold Out" = Temporarily out of stock' },
        { 'Instructions': '' },
        { 'Instructions': '4. PHOTO CREDITS:' },
        { 'Instructions': '   - main_credit_type: "own" or "commercial"' },
        { 'Instructions': '   - For commercial: provide source name and a URL if you want to link to the external site' },
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
      
      // Filter out rows with blank update_mode in smart mode
      const rowsToProcess = masterData.filter(row => {
        const mode = row.update_mode ? row.update_mode.toLowerCase().trim() : '';
        // In smart mode, only process rows that have an explicit update_mode value
        return mode !== '';
      });
      
      // Analyze the filtered data to provide a summary
      let addCount = 0;
      let updateCount = 0;
      let archiveCount = 0;
      
      rowsToProcess.forEach(row => {
        const mode = row.update_mode.toLowerCase().trim();
        
        // Handle all variations of the update modes
        if (mode === 'add' || mode === 'add_new') {
          addCount++;
        } else if (mode === 'hide' || mode === 'hide_plant' || mode === 'hide_from_shop' || mode === 'archive') {
          archiveCount++;
        } else {
          // For 'update', 'update_existing', or any other explicit value
          updateCount++;
        }
      });
      
      // Transform for preview (showing first 10 filtered rows with their actions)
      const previewRows = rowsToProcess.slice(0, 10).map(row => ({
        id: row.plant_id || '', // Keep original ID (don't parse to int for gift certificates)
        name: row.name || '',
        price: parseFloat(String(row.price || 0).replace(/[$,]/g, '')) || 0,
        stock: parseInt(row.current_stock || 0),
        action: row.update_mode.toLowerCase().trim(),
        mainImage: row.mainimage || ''
      }));
      
      // Store filtered data for actual import
      setPreviewData({
        masterData: rowsToProcess,
        preview: previewRows,
        summary: {
          total: rowsToProcess.length,
          add: addCount,
          update: updateCount,
          archive: archiveCount,
          skipped: masterData.length - rowsToProcess.length
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
      const plantsToTransform = previewData.masterData || previewData.plants || [];
      const transformedPlantsData = plantsToTransform.map(plant => {
        const plantData = {
          id: plant.plant_id || '', // Keep original ID (string for gift certificates)
          update_mode: plant.update_mode || '', // Include update_mode for smart mode
          name: plant.name || '',
          scientificName: plant.latinname || '',
          commonName: plant.commonname || '',
          price: parseFloat(String(plant.price || 0).replace(/[$,]/g, '')) || 0,
          featured: (plant.featured === 'true' || plant.featured === 'TRUE' || plant.featured === true),
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
              // Handle source field for own photos (could be photographer name or "Buttons Flower Farm")
              if (mainSource) {
                // If source is the farm name, just store the type
                if (mainSource === 'Buttons Flower Farm') {
                  // Type is already set to 'own', that's enough
                } else {
                  // Otherwise treat it as photographer name
                  plantData.imageMetadata[safeKey].photographer = mainSource;
                }
              } else if (mainPhotographer) {
                // Fall back to photographer field if it exists
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
                // Handle source field for own photos (could be photographer name or "Buttons Flower Farm")
                if (source) {
                  // If source is the farm name, just store the type
                  if (source === 'Buttons Flower Farm') {
                    // Type is already set to 'own', that's enough
                  } else {
                    // Otherwise treat it as photographer name
                    plantData.imageMetadata[safeKey].photographer = source;
                  }
                } else if (photographer) {
                  // Fall back to photographer field if it exists
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
      // For master data, only include inventory for rows with update_mode values
      const transformedInventoryData = previewData.masterData ? 
        previewData.masterData
          .filter(row => row.update_mode && row.update_mode.trim() !== '') // Only rows with update_mode
          .map(row => ({
            plant_id: row.plant_id,  // Use plant_id to match what firebase.js expects
            current_stock: parseInt(row.current_stock || 0),  // Use current_stock field name
            status: row.status || 'Unknown',
            restock_date: row.restock_date || '',
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

  // Removed old update inventory handler - now using unified system

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
              <h3>📊 Export Your Database</h3>
              <p>Download your complete database as an Excel spreadsheet for backup or editing.</p>
              <p className="tip">💡 Tip: Create a backup before any major changes!</p>
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
                Downloads an Excel file with all plants and inventory that can be edited and re-imported
              </p>
            </div>
          </div>
        )}
        
        {/* Import / Update Tab */}
        {activeTab === 'import' && (
          <div className="import-section">
            <div style={{textAlign: 'center', marginBottom: '20px', padding: '15px', backgroundColor: '#fffef0', borderRadius: '8px', border: '1px solid #fff4c4'}}>
              <p style={{fontSize: '14px', color: '#6c757d', margin: 0}}>
                💡 <strong>Tip:</strong> Export your database first from the Export tab, make changes to the spreadsheet, then upload it here
              </p>
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
                  
                  <p>Showing first {Math.min(10, previewData.preview.length)} of {previewData.summary.total} plants to process
                    {previewData.summary.skipped > 0 && (
                      <span style={{color: '#6c757d', fontSize: '14px', marginLeft: '10px'}}>
                        ({previewData.summary.skipped} rows with blank update_mode were skipped)
                      </span>
                    )}:</p>
                  
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
                                  plant.action === 'add' ? '#d4edda' :
                                  (plant.action === 'hide' || plant.action === 'hide_from_shop') ? '#f8d7da' :
                                  '#cce5ff',
                                color:
                                  plant.action === 'add' ? '#155724' :
                                  (plant.action === 'hide' || plant.action === 'hide_from_shop') ? '#721c24' :
                                  '#004085'
                              }}>
                                {plant.action === 'add' ? 'ADD' :
                                 (plant.action === 'hide' || plant.action === 'hide_from_shop') ? 'HIDE' :
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
    </div>
  );
};

export default InventoryImportExport;