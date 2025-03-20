import React, { useState } from 'react';
import { importPlantsFromSheets } from '../services/firebase';

const SheetMigration = () => {
  const [plantsFileInput, setPlantsFileInput] = useState(null);
  const [inventoryFileInput, setInventoryFileInput] = useState(null);
  const [plantsCsvUrl, setPlantsCsvUrl] = useState('');
  const [inventoryCsvUrl, setInventoryCsvUrl] = useState('');
  const [status, setStatus] = useState({ loading: false, message: '' });
  
  // Helper function to parse CSV data
  const parseCSV = (csvText) => {
    // Split by lines and remove empty lines
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(header => 
      header.trim().toLowerCase().replace(/["']/g, '')
    );
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      // Handle quoted fields correctly
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
      
      // Create object from headers and values
      if (values.length === headers.length) {
        const obj = {};
        headers.forEach((header, index) => {
          // Skip empty headers
          if (header) {
            obj[header] = values[index];
          }
        });
        data.push(obj);
      }
    }
    
    return data;
  };
  
  const fetchCsvFromUrl = async (url) => {
    try {
      setStatus({ loading: true, message: `Fetching CSV from URL: ${url}...` });
      
      // Using a proxy to avoid CORS issues
      const corsProxy = 'https://corsproxy.io/?';
      const response = await fetch(`${corsProxy}${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV data: ${response.status}`);
      }
      
      const csvText = await response.text();
      return parseCSV(csvText);
    } catch (error) {
      console.error('Error fetching from CSV URL:', error);
      throw error;
    }
  };
  
  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csvText = event.target.result;
          const parsedData = parseCSV(csvText);
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Error reading file'));
      
      reader.readAsText(file);
    });
  };
  
  const handleMigration = async (e) => {
    e.preventDefault();
    
    // Check that we have at least one plants data source
    if (!plantsFileInput && !plantsCsvUrl) {
      setStatus({ 
        loading: false, 
        message: 'Please either upload a plants CSV file or provide a Google Sheets CSV URL' 
      });
      return;
    }
    
    try {
      setStatus({ loading: true, message: 'Starting migration...' });
      
      // Get plants data
      let plantsData;
      if (plantsFileInput) {
        setStatus({ loading: true, message: 'Reading plants CSV file...' });
        plantsData = await readFile(plantsFileInput);
      } else if (plantsCsvUrl) {
        plantsData = await fetchCsvFromUrl(plantsCsvUrl);
      }
      
      if (!plantsData || plantsData.length === 0) {
        throw new Error('Invalid plants data format or empty CSV');
      }
      
      // Filter out empty or invalid plant records
      const validPlants = plantsData.filter(plant => {
        // Check for required fields - at minimum we need plant_id and name
        if (!plant.plant_id || !plant.name) {
          return false;
        }
        
        // Skip specific ID ranges if they're known to be blank (like plants 5-45)
        const plantId = parseInt(plant.plant_id);
        if (plantId >= 5 && plantId <= 45) {
          return false;
        }
        
        // Additional validation can be added here
        return true;
      });
      
      const skippedCount = plantsData.length - validPlants.length;
      
      setStatus({ 
        loading: true, 
        message: `Found ${plantsData.length} plants in the CSV. ${skippedCount} blank/invalid plants will be skipped. Processing ${validPlants.length} valid plants...` 
      });
      
      // Transform plant data to match Firebase expected structure
      const transformedPlantsData = validPlants.map(plant => {
        // Log the original plant data to help identify header issues
        console.log('Original plant data headers:', Object.keys(plant));
        
        return {
          id: parseInt(plant.plant_id) || 0,
          name: plant.name || '',
          scientificName: plant.latinname || '',
          commonName: plant.commonname || '',
          price: plant.price || plant.Price || 0,
          featured: plant.featured === 'true' || plant.featured === true || plant.Featured === 'true' || plant.Featured === true,
          plantType: plant['type(annual/perennial)'] || plant['Type(Annual/Perennial)'] || '',
          description: plant.description || '',
          bloomSeason: plant['bloom season'] || plant['Bloom Season'] || plant['bloom Season'] || plant['Bloom season'] || '',
          colour: plant.colour || plant.Colour || plant.color || plant.Color || '',
          light: plant['sun light'] || plant['Sun Light'] || plant['sunlight'] || plant['Sunlight'] || plant['sun_light'] || plant['Sun_Light'] || '',
          spacing: plant['spread (inches)'] || plant['Spread (inches)'] || plant['spread(inches)'] || plant['Spread(inches)'] || '',
          height: plant['height (inches)'] || plant['Height (inches)'] || plant['height(inches)'] || plant['Height(inches)'] || '',
          hardinessZone: plant['hardiness zones'] || plant['Hardiness Zones'] || plant['hardiness zone'] || plant['Hardiness Zone'] || '',
          specialFeatures: plant['special features'] || plant['Special Features'] || '',
          uses: plant.uses || plant.Uses || '',
          aroma: plant.aroma || plant.Aroma || '',
          gardeningTips: plant['gardening tips'] || plant['Gardening Tips'] || '',
          careTips: plant['care tips'] || plant['Care Tips'] || '',
          mainImage: plant['main image'] || plant['Main Image'] || plant['mainimage'] || plant['MainImage'] || '',
          additionalImages: plant['additional image'] || plant['Additional Image'] || plant['additionalimage'] || plant['AdditionalImage'] || ''
        };
      });
      
      // Get inventory data (if available)
      let inventoryData = [];
      if (inventoryFileInput) {
        setStatus({ loading: true, message: 'Reading inventory CSV file...' });
        inventoryData = await readFile(inventoryFileInput);
        
        // Filter inventory data to match only the valid plants we're importing
        const validPlantIds = transformedPlantsData.map(p => p.id.toString());
        inventoryData = inventoryData.filter(item => 
          item.plant_id && validPlantIds.includes(item.plant_id.toString())
        );
      } else if (inventoryCsvUrl) {
        try {
          inventoryData = await fetchCsvFromUrl(inventoryCsvUrl);
          
          // Filter inventory data to match only the valid plants we're importing
          const validPlantIds = transformedPlantsData.map(p => p.id.toString());
          inventoryData = inventoryData.filter(item => 
            item.plant_id && validPlantIds.includes(item.plant_id.toString())
          );
        } catch (error) {
          console.error('Error fetching inventory data:', error);
          setStatus({ 
            loading: true, 
            message: `Warning: Could not fetch inventory data: ${error.message}. Continuing with plants only...` 
          });
          inventoryData = [];
        }
      }
      
      if (inventoryData.length > 0) {
        setStatus({ 
          loading: true, 
          message: `Found ${validPlants.length} valid plants and ${inventoryData.length} inventory records. Importing to Firebase...` 
        });
      } else {
        // If no inventory data provided, create default inventory records
        inventoryData = transformedPlantsData.map(plant => ({
          plant_id: plant.id,
          current_stock: 0,
          status: 'out_of_stock',
          restock_date: '',
          notes: 'Auto-generated during migration'
        }));
      }
      
      // Send the data to Firebase
      const result = await importPlantsFromSheets(transformedPlantsData, inventoryData);
      
      setStatus({ 
        loading: false, 
        message: `Successfully imported ${result.plantsCount} plants and ${result.inventoryCount} inventory items to Firebase! (${skippedCount} blank/invalid plants were skipped)`,
        success: true
      });
    } catch (error) {
      console.error('Migration error:', error);
      setStatus({ 
        loading: false, 
        message: `Error: ${error.message}`,
        error: true
      });
    }
  };
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Google Sheets to Firebase Migration</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Instructions</h2>
        <ol>
          <li>
            You have two options for importing your data:
            <ul>
              <li><strong>Option 1:</strong> Upload CSV files directly</li>
              <li><strong>Option 2:</strong> Provide URLs to CSV files published from Google Sheets</li>
            </ul>
          </li>
          <li>
            If using Google Sheets URLs:
            <ol>
              <li>Publish your sheets to the web (File &gt; Share &gt; Publish to web)</li>
              <li>Select "Comma-separated values (.csv)" format</li>
              <li>Copy the URLs and paste them below</li>
            </ol>
          </li>
        </ol>
      </div>
      
      <form onSubmit={handleMigration} style={{ marginBottom: '20px' }}>
        <h3>Plants Data (Required)</h3>
        
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h4>Option 1: Upload Plants CSV File</h4>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setPlantsFileInput(e.target.files[0])}
              style={{ display: 'block', marginBottom: '5px' }}
            />
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0' }}>
              Select a CSV file from your computer
            </p>
          </div>
          
          <h4>OR Option 2: Google Sheets CSV URL</h4>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              value={plantsCsvUrl}
              onChange={(e) => setPlantsCsvUrl(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc' 
              }}
              placeholder="https://docs.google.com/spreadsheets/d/e/your-sheet-id/pub?output=csv"
            />
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0' }}>
              Paste the URL from Google Sheets "Publish to web" (CSV format)
            </p>
          </div>
        </div>
        
        <h3>Inventory Data (Optional)</h3>
        
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h4>Option 1: Upload Inventory CSV File</h4>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setInventoryFileInput(e.target.files[0])}
              style={{ display: 'block', marginBottom: '5px' }}
            />
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0' }}>
              Select a CSV file from your computer
            </p>
          </div>
          
          <h4>OR Option 2: Google Sheets CSV URL</h4>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              value={inventoryCsvUrl}
              onChange={(e) => setInventoryCsvUrl(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc' 
              }}
              placeholder="https://docs.google.com/spreadsheets/d/e/your-sheet-id/pub?output=csv"
            />
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0' }}>
              Paste the URL from Google Sheets "Publish to web" (CSV format)
            </p>
          </div>
          
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
            If not provided, default inventory records will be created automatically.
          </p>
        </div>
        
        <button 
          type="submit"
          disabled={status.loading || (!plantsFileInput && !plantsCsvUrl)}
          style={{
            padding: '10px 15px',
            backgroundColor: status.loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status.loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {status.loading ? 'Migrating...' : 'Start Migration'}
        </button>
      </form>
      
      {status.message && (
        <div style={{ 
          padding: '15px', 
          marginTop: '20px',
          backgroundColor: status.error ? '#ffebee' : status.success ? '#e8f5e9' : '#f5f5f5',
          border: `1px solid ${status.error ? '#ffcdd2' : status.success ? '#a5d6a7' : '#ddd'}`,
          borderRadius: '4px'
        }}>
          <p>{status.message}</p>
        </div>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <h3>Data Format Requirements</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4>Plants CSV Format</h4>
          <p>Your Plants CSV should have the following columns:</p>
          <ul>
            <li><strong>plant_id</strong> - Unique identifier (number)</li>
            <li><strong>name</strong> - Plant name</li>
            <li><strong>latinname</strong> - Latin/scientific name</li>
            <li><strong>commonname</strong> - Common name</li>
            <li><strong>price</strong> - Price</li>
            <li><strong>featured</strong> - Featured (true/false)</li>
            <li><strong>type(annual/perennial)</strong> - Plant type</li>
            <li><strong>description</strong> - Description</li>
            <li><strong>bloom season</strong> - Bloom season</li>
            <li><strong>colour</strong> or <strong>color</strong> - Color</li>
            <li><strong>sun light</strong> - Light requirements</li>
            <li><strong>spread (inches)</strong> - Spacing requirements</li>
            <li><strong>height (inches)</strong> - Height</li>
            <li><strong>hardiness zones</strong> - Hardiness zone</li>
            <li><strong>special features</strong> - Special features</li>
            <li><strong>uses</strong> - Uses</li>
            <li><strong>aroma</strong> - Aroma</li>
            <li><strong>gardening tips</strong> - Gardening tips</li>
            <li><strong>care tips</strong> - Care tips</li>
            <li><strong>main image</strong> - URL to main image</li>
            <li><strong>additional image</strong> - URLs to additional images (comma-separated)</li>
          </ul>
          <p>Note: Headers are case-sensitive. The system will also look for variations including capitalized versions (e.g., "Bloom Season" or "Sun Light").</p>
        </div>
        
        <div>
          <h4>Inventory CSV Format</h4>
          <p>Your Inventory CSV should have the following columns:</p>
          <ul>
            <li><strong>plant_id</strong> - ID matching the plant's ID</li>
            <li><strong>current_stock</strong> - Current stock level</li>
            <li><strong>status</strong> - Status (e.g., in_stock, out_of_stock, low_stock)</li>
            <li><strong>restock_date</strong> - Expected restock date</li>
            <li><strong>notes</strong> - Additional notes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SheetMigration; 