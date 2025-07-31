const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

// Extremely simple contact form handler - just for testing CORS
exports.simpleContact = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    // Set CORS headers explicitly just to be extra sure
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    console.log('simpleContact function called');
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    
    if (req.method === 'OPTIONS') {
      // Handle preflight request
      res.status(204).send('');
      return;
    }
    
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    
    // Just log the body and return success - no actual email sending
    console.log('Received form data:', req.body);
    
    res.status(200).json({ 
      success: true, 
      message: 'Contact form received successfully (this is just a test function)',
    });
  });
}); 