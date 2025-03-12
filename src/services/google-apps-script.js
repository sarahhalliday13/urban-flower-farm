// This is a template for your Google Apps Script
// You'll need to copy this code to your Google Apps Script project
// and deploy it as a web app

function doGet(e) {
  // Set CORS headers
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
    return output.setContent(JSON.stringify({ error: error.toString() }));
  }
}

// This function handles POST requests (for future use if you want to update inventory)
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // Parse the POST data
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === 'updateInventory') {
      // Update inventory logic
      var plantId = postData.plantId;
      var newStock = postData.newStock;
      
      // Open the spreadsheet
      var ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
      var inventorySheet = ss.getSheetByName('inventory');
      
      // Find the row for this plant
      var inventoryData = inventorySheet.getDataRange().getValues();
      var headers = inventoryData[0];
      
      // Try different possible column names for plant_id
      var plantIdCol = headers.indexOf('plant_id');
      if (plantIdCol === -1) plantIdCol = headers.indexOf('plantId');
      if (plantIdCol === -1) plantIdCol = headers.indexOf('id');
      if (plantIdCol === -1) plantIdCol = headers.indexOf('ID');
      if (plantIdCol === -1) plantIdCol = headers.indexOf('Plant_ID');
      
      // Try different possible column names for current_stock
      var stockCol = headers.indexOf('current_stock');
      if (stockCol === -1) stockCol = headers.indexOf('currentStock');
      if (stockCol === -1) stockCol = headers.indexOf('stock');
      if (stockCol === -1) stockCol = headers.indexOf('Stock');
      if (stockCol === -1) stockCol = headers.indexOf('Current Stock');
      
      if (plantIdCol === -1 || stockCol === -1) {
        return output.setContent(JSON.stringify({ 
          success: false, 
          error: 'Required columns not found in inventory sheet. Looking for plant_id (found: ' + (plantIdCol !== -1) + ') and current_stock (found: ' + (stockCol !== -1) + ')' 
        }));
      }
      
      var rowIndex = -1;
      for (var i = 1; i < inventoryData.length; i++) {
        // Convert both to strings for comparison
        if (String(inventoryData[i][plantIdCol]) === String(plantId)) {
          rowIndex = i + 1; // +1 because sheet rows are 1-indexed
          break;
        }
      }
      
      if (rowIndex === -1) {
        // Plant not found in inventory, add a new row
        var newRow = [];
        for (var j = 0; j < headers.length; j++) {
          newRow[j] = '';
        }
        newRow[plantIdCol] = plantId;
        newRow[stockCol] = newStock;
        inventorySheet.appendRow(newRow);
      } else {
        // Update existing row
        inventorySheet.getRange(rowIndex, stockCol + 1).setValue(newStock);
      }
      
      return output.setContent(JSON.stringify({ 
        success: true, 
        message: 'Inventory updated successfully' 
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