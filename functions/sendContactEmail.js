const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const cors = require('cors')({ 
  origin: ['https://buttonsflowerfarm-8a54d.web.app', 'https://urban-flower-farm-staging.web.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
});

// Get the SendGrid API key from Firebase config first, then environment as fallback
let apiKey;
try {
  apiKey = functions.config().sendgrid?.api_key;
  if (!apiKey) {
    console.log('API key not found in Firebase config, trying environment variable...');
    apiKey = process.env.SENDGRID_API_KEY;
  }
} catch (error) {
  console.error('Error reading Firebase config:', error);
  // Fallback to environment variable
  apiKey = process.env.SENDGRID_API_KEY;
}

console.log('API Key status:', apiKey ? 'Found (length: ' + apiKey.length + ')' : 'Not found');
if (!apiKey) {
  console.error('No SendGrid API key found in Firebase config or environment variables!');
} else {
  sgMail.setApiKey(apiKey);
}

// Email configuration
const BUTTONS_EMAIL = 'Buttonsflowerfarm@gmail.com';
const ADMIN_EMAIL = 'sarah.halliday@gmail.com'; // Add a backup email

// Handler function for Express routing
exports.handler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ 
        success: false,
        error: 'Method Not Allowed' 
      });
      return;
    }

    // Check if API key is available
    if (!apiKey) {
      console.error('SendGrid API key not available');
      res.status(500).json({ 
        success: false,
        error: 'Email service is currently unavailable. Your message has been saved and will be processed manually.' 
      });
      return;
    }

    const { name, email, phone, subject, message } = req.body;
    
    console.log('Contact form submission received:', { 
      name, 
      email, 
      subject: subject || 'Contact Form Submission' 
    });

    // Send to both the main email and admin email for redundancy
    const msg = {
      to: [BUTTONS_EMAIL, ADMIN_EMAIL], // Send to both emails
      from: BUTTONS_EMAIL, // Verified sender
      replyTo: email,
      subject: subject || `New message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a7c59;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            <h3 style="color: #4a7c59;">Message:</h3>
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
        </div>
      `
    };

    console.log('Sending email to:', msg.to);
    const result = await sgMail.send(msg);
    console.log('SendGrid response:', JSON.stringify(result));
    res.status(200).json({ 
      success: true,
      message: 'Email sent successfully',
      recipient: BUTTONS_EMAIL
    });
  } catch (error) {
    console.error('SendGrid error:', error);
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    res.status(500).json({ 
      success: false,
      error: 'Email service is currently unavailable. Your message has been saved and will be processed manually.' 
    });
  }
};

// HTTP function version for direct calling
const sendContactEmail = functions.https.onRequest((req, res) => {
  // Set CORS headers for all requests
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  cors(req, res, async () => {
    return exports.handler(req, res);
  });
});

// Export functions
module.exports = { 
  sendContactEmail,
  handler: exports.handler
}; 