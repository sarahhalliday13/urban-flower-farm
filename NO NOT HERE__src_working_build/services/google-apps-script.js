// This is a template for your Google Apps Script
// You'll need to copy this code to your Google Apps Script project
// and deploy it as a web app

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!! IMPORTANT: REPLACE 'YOUR_SPREADSHEET_ID' WITH YOUR ACTUAL SPREADSHEET ID IN BOTH FUNCTIONS !!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

function doGet(e) {
  // Set CORS headers for cross-origin access
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Get the requested sheet (default to 'plants' if not specified)
  var sheetName = e.parameter.sheet || 'plants';
  
  try {
    // Open the spreadsheet - MAKE SURE TO REPLACE THIS WITH YOUR ACTUAL SPREADSHEET ID
    var ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID'); // Replace with your actual spreadsheet ID
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return output.setContent(JSON.stringify({ error: 'Sheet not found: ' + sheetName }));
    }
    
    // Get all data from the sheet
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var jsonData = [];
    
    // Log the headers for debugging
    console.log('Headers for sheet ' + sheetName + ':', headers);
    
    // Convert sheet data to JSON
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowData = {};
      var hasData = false;
      
      for (var j = 0; j < headers.length; j++) {
        if (headers[j] !== '') {
          // Make sure to trim header names to avoid whitespace issues
          var header = headers[j].trim();
          
          // Skip empty cells
          if (row[j] !== '') {
            rowData[header] = row[j];
            hasData = true;
          }
        }
      }
      
      // Only add non-empty rows
      if (hasData) {
        jsonData.push(rowData);
      }
    }
    
    // Log the data for debugging
    console.log('Returning data for sheet: ' + sheetName);
    console.log('Number of rows: ' + jsonData.length);
    if (jsonData.length > 0) {
      console.log('First row sample: ' + JSON.stringify(jsonData[0]));
    }
    
    return output.setContent(JSON.stringify(jsonData));
    
  } catch (error) {
    console.error('Error in doGet: ' + error.toString());
    return output.setContent(JSON.stringify({ 
      error: error.toString() 
    }));
  }
}

// This function handles POST requests for updating inventory
function doPost(e) {
  // Set CORS headers for cross-origin access
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // Parse the POST data
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === 'updateInventory') {
      // Get inventory data from the request
      var plantId = postData.plantId;
      var inventoryData = postData.inventoryData;
      
      console.log('Updating inventory for plant ' + plantId + ':', inventoryData);
      
      // Open the spreadsheet - MAKE SURE TO REPLACE THIS WITH YOUR ACTUAL SPREADSHEET ID
      var ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID'); // Replace with your actual spreadsheet ID
      var inventorySheet = ss.getSheetByName('inventory');
      
      if (!inventorySheet) {
        console.log('Inventory sheet not found, creating it');
        inventorySheet = ss.insertSheet('inventory');
        
        // Set up headers for the inventory sheet - MATCH YOUR ACTUAL HEADERS
        var headers = ['plant_id', 'current_stock', 'status', 'restock_date', 'notes', 'last_updated'];
        inventorySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      
      // Find the row for this plant
      var inventoryData_sheet = inventorySheet.getDataRange().getValues();
      var headers = inventoryData_sheet[0];
      
      // Find column indexes for all fields - UPDATED TO MATCH YOUR ACTUAL HEADERS
      var plantIdCol = headers.indexOf('plant_id');
      if (plantIdCol === -1) plantIdCol = headers.indexOf('plantId');
      if (plantIdCol === -1) plantIdCol = headers.indexOf('id');
      if (plantIdCol === -1) plantIdCol = headers.indexOf('ID');
      if (plantIdCol === -1) plantIdCol = headers.indexOf('Plant_ID');
      
      var stockCol = headers.indexOf('current_stock');
      if (stockCol === -1) stockCol = headers.indexOf('currentStock');
      if (stockCol === -1) stockCol = headers.indexOf('stock');
      if (stockCol === -1) stockCol = headers.indexOf('Stock');
      if (stockCol === -1) stockCol = headers.indexOf('Current Stock');
      
      var statusCol = headers.indexOf('status');
      if (statusCol === -1) statusCol = headers.indexOf('Status');
      
      var restockDateCol = headers.indexOf('restock_date');
      if (restockDateCol === -1) restockDateCol = headers.indexOf('restockDate');
      if (restockDateCol === -1) restockDateCol = headers.indexOf('Restock Date');
      
      var notesCol = headers.indexOf('notes');
      if (notesCol === -1) notesCol = headers.indexOf('Notes');
      
      var lastUpdatedCol = headers.indexOf('last_updated');
      if (lastUpdatedCol === -1) lastUpdatedCol = headers.indexOf('lastUpdated');
      if (lastUpdatedCol === -1) lastUpdatedCol = headers.indexOf('Last Updated');
      
      // Ensure required columns exist
      if (plantIdCol === -1 || stockCol === -1) {
        return output.setContent(JSON.stringify({ 
          success: false, 
          error: 'Required columns not found in inventory sheet. Looking for plant_id (found: ' + (plantIdCol !== -1) + ') and current_stock (found: ' + (stockCol !== -1) + ')' 
        }));
      }
      
      // Find the row for this plant
      var rowIndex = -1;
      for (var i = 1; i < inventoryData_sheet.length; i++) {
        // Convert both to strings for comparison
        if (String(inventoryData_sheet[i][plantIdCol]) === String(plantId)) {
          rowIndex = i + 1; // +1 because sheet rows are 1-indexed
          break;
        }
      }
      
      // Current timestamp for last_updated field
      var timestamp = new Date().toISOString();
      
      if (rowIndex === -1) {
        // Plant not found in inventory, add a new row
        console.log('Plant ' + plantId + ' not found in inventory, adding new row');
        
        var newRow = Array(headers.length).fill('');
        newRow[plantIdCol] = plantId;
        newRow[stockCol] = inventoryData.current_stock;
        
        // Add other fields if columns exist
        if (statusCol !== -1) newRow[statusCol] = inventoryData.status || '';
        if (restockDateCol !== -1) newRow[restockDateCol] = inventoryData.restock_date || '';
        if (notesCol !== -1) newRow[notesCol] = inventoryData.notes || '';
        if (lastUpdatedCol !== -1) newRow[lastUpdatedCol] = timestamp;
        
        inventorySheet.appendRow(newRow);
      } else {
        // Update existing row
        console.log('Updating existing inventory for plant ' + plantId + ' at row ' + rowIndex);
        
        // Update stock
        inventorySheet.getRange(rowIndex, stockCol + 1).setValue(inventoryData.current_stock);
        
        // Update other fields if columns exist
        if (statusCol !== -1) inventorySheet.getRange(rowIndex, statusCol + 1).setValue(inventoryData.status || '');
        if (restockDateCol !== -1) inventorySheet.getRange(rowIndex, restockDateCol + 1).setValue(inventoryData.restock_date || '');
        if (notesCol !== -1) inventorySheet.getRange(rowIndex, notesCol + 1).setValue(inventoryData.notes || '');
        if (lastUpdatedCol !== -1) inventorySheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(timestamp);
      }
      
      return output.setContent(JSON.stringify({ 
        success: true, 
        message: 'Inventory updated successfully for plant ' + plantId,
        timestamp: timestamp
      }));
    } else {
      return output.setContent(JSON.stringify({ 
        success: false, 
        error: 'Unknown action: ' + action 
      }));
    }
    
  } catch (error) {
    console.error('Error in doPost: ' + error.toString());
    return output.setContent(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    }));
  }
} 