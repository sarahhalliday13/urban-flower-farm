import React, { useState } from 'react';
import { updateInventoryStock } from '../services/firebase';
import { useToast } from '../context/ToastContext';

const InventoryUpdater = () => {
  const [inventoryFile, setInventoryFile] = useState(null);
  const [status, setStatus] = useState({ loading: false, message: '' });
  const { addToast } = useToast();

  // Helper function to parse CSV data
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(header => 
      header.trim().toLowerCase().replace(/[\"']/g, '')
    );
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/[\"']/g, ''));
      
      if (values.length === headers.length) {
        const obj = {};
        headers.forEach((header, index) => {
          if (header) {
            obj[header] = values[index];
          }
        });
        data.push(obj);
      }
    }
    
    return data;
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

  const handleUpdateInventory = async (e) => {
    e.preventDefault();
    
    if (!inventoryFile) {
      setStatus({ loading: false, message: 'Please select an inventory CSV file' });
      return;
    }
    
    try {
      setStatus({ loading: true, message: 'Reading inventory file...' });
      
      const inventoryData = await readFile(inventoryFile);
      
      setStatus({ loading: true, message: `Found ${inventoryData.length} inventory records. Updating...` });
      
      const result = await updateInventoryStock(inventoryData);
      
      if (result.success) {
        setStatus({ 
          loading: false, 
          message: result.message,
          success: true
        });
        addToast(result.message, 'success');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      setStatus({ 
        loading: false, 
        message: `Error: ${error.message}`,
        error: true
      });
      addToast(error.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Update Inventory Stock</h1>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        border: '1px solid #2196f3',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <p style={{ margin: 0 }}>
          This tool updates inventory stock levels for <strong>existing plants only</strong>. 
          Use this after importing plants to set their stock levels.
        </p>
      </div>
      
      <form onSubmit={handleUpdateInventory}>
        <div style={{ marginBottom: '20px' }}>
          <h3>Upload Inventory CSV</h3>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setInventoryFile(e.target.files[0])}
            style={{ display: 'block', marginBottom: '10px' }}
          />
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            CSV should have columns: plant_id, current_stock (or stock/quantity)
          </p>
        </div>
        
        <button 
          type="submit"
          disabled={status.loading || !inventoryFile}
          style={{
            padding: '10px 20px',
            backgroundColor: status.loading ? '#ccc' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status.loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {status.loading ? 'Updating...' : 'Update Inventory'}
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
    </div>
  );
};

export default InventoryUpdater;