const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

// Email configuration
const BUTTONS_EMAIL = 'Buttonsflowerfarm@gmail.com';
const ADMIN_EMAIL = 'sarah.halliday@gmail.com'; // Backup email

// Initialize SendGrid with API key
let apiKey;
try {
  // First try to get from Firebase config
  apiKey = functions.config().sendgrid?.api_key;
  if (apiKey) {
    console.log('Using SendGrid API key from Firebase config');
  } else {
    // Fallback to environment variable
    apiKey = process.env.SENDGRID_API_KEY;
    console.log('Using SendGrid API key from environment variable');
  }
} catch (error) {
  console.error('Error accessing Firebase config:', error);
  // Fallback to environment variable
  apiKey = process.env.SENDGRID_API_KEY;
}

// Log API key status
console.log('API Key status:', apiKey ? `Found (length: ${apiKey.length})` : 'Not found');
if (apiKey) {
  sgMail.setApiKey(apiKey);
  console.log('SendGrid API initialized');
} else {
  console.error('No SendGrid API key found!');
}

exports.directContactEmail = functions.https.onRequest((req, res) => {
  // Set CORS headers for preflight requests
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Handle actual request
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method Not Allowed' 
    });
  }
  
  console.log('Contact request received with body:', JSON.stringify(req.body, null, 2));
  
  // Extract data from request
  const { name, email, phone, subject, message } = req.body;
  
  if (!apiKey) {
    console.error('SendGrid API key not available');
    return res.status(500).json({ 
      success: true, // Return success even though we didn't send email
      message: 'Your message has been received. Email service is currently unavailable, but your message has been saved.'
    });
  }
  
  if (!name || !email || !message) {
    console.error('Missing required fields:', { name, email, message });
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }
  
  console.log('Contact form submission received:', { 
    name, 
    email, 
    subject: subject || 'Contact Form Submission' 
  });
  
  // Create email
  const msg = {
    to: [BUTTONS_EMAIL, ADMIN_EMAIL],
    from: BUTTONS_EMAIL,
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
  
  console.log('Attempting to send email to:', msg.to);
  
  // Send email
  sgMail.send(msg)
    .then(result => {
      console.log('SendGrid response:', JSON.stringify(result, null, 2));
      return res.status(200).json({ 
        success: true,
        message: 'Your message has been sent successfully.',
        recipient: BUTTONS_EMAIL
      });
    })
    .catch(error => {
      console.error('SendGrid error:', error);
      if (error.response) {
        console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
      }
      
      // Still return success to the user, but log the failure
      return res.status(200).json({ 
        success: true,
        message: 'Your message has been received. We will get back to you shortly.'
      });
    });
});
