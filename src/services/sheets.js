import { google } from 'googleapis';
import credentials from '../config/sheets-credentials.json';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_ID = '1M84FWGUzHfNezP3lHmi1xQj1eEAwdjt4KiUOV-k7Hks';

// Create auth client
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

export const fetchProducts = async () => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Products!A2:P', // Excluding header row
    });

    const rows = response.data.values || [];
    
    return rows.map(row => ({
      id: row[0],
      name: row[1],
      latinName: row[2],
      commonName: row[3],
      price: parseFloat(row[4]),
      description: row[5],
      bloomSeason: row[6],
      colour: row[7],
      light: row[8],
      spacing: row[9],
      attributes: row[10],
      hardinessZone: row[11],
      height: row[12],
      mainImage: row[13],
      additionalImages: row[14] ? row[14].split(',') : [],
      availability: row[15]
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const fetchInventory = async () => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Inventory!A2:E', // Excluding header row
    });

    const rows = response.data.values || [];
    
    return rows.map(row => ({
      plantId: row[0],
      currentStock: parseInt(row[1], 10),
      status: row[2],
      nextAvailable: row[3],
      notes: row[4]
    }));
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
};

export const fetchProductsWithInventory = async () => {
  const [products, inventory] = await Promise.all([
    fetchProducts(),
    fetchInventory()
  ]);

  return products.map(product => ({
    ...product,
    inventory: inventory.find(inv => inv.plantId === product.id) || {
      currentStock: 0,
      status: 'Out of Stock',
      nextAvailable: '',
      notes: ''
    }
  }));
}; 