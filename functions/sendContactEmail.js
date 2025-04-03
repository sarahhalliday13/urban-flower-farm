const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const cors = require('cors')({ 
  origin: ['https://buttonsflowerfarm-8a54d.web.app', 'http://localhost:3000'], 
  credentials: true 
});

// Get the SendGrid API key from environment
const apiKey = process.env.SENDGRID_API_KEY;
console.log('API Key status:', apiKey ? 'Found (length: ' + apiKey.length + ')' : 'Not found');
sgMail.setApiKey(apiKey);

// Email configuration
const BUTTONS_EMAIL = 'Buttonsflowerfarm@gmail.com';
const ADMIN_EMAIL = 'sarah.halliday@gmail.com'; // Add a backup email

exports.sendContactEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send({ error: 'Method Not Allowed' });
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

    try {
      console.log('Sending email to:', msg.to);
      const result = await sgMail.send(msg);
      console.log('SendGrid response:', JSON.stringify(result));
      return res.status(200).send({ 
        message: 'Email sent successfully',
        recipient: BUTTONS_EMAIL
      });
    } catch (error) {
      console.error('SendGrid error:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return res.status(500).send({ error: 'Failed to send email' });
    }
  });
}); 