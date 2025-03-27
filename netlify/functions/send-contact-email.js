const sgMail = require('@sendgrid/mail');

const BUTTONS_EMAIL = 'buttonsflowerfarm@gmail.com';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(apiKey);

exports.handler = async function(event, context) {
  console.log('Contact form email function triggered');
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  console.log('Environment:', process.env.NODE_ENV);
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    console.log('Contact form data received:', {
      name: data.name,
      email: data.email,
      subject: data.subject || 'Contact Form Submission'
    });

    // Validate required fields
    if (!data.name || !data.email || !data.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Prepare email
    const msg = {
      to: BUTTONS_EMAIL,
      from: BUTTONS_EMAIL, // Must be verified sender
      replyTo: data.email,
      subject: data.subject || `New message from ${data.name}`,
      text: `
Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'Not provided'}

Message:
${data.message}
      `,
      html: `
<h3>New Contact Form Submission</h3>
<p><strong>Name:</strong> ${data.name}</p>
<p><strong>Email:</strong> ${data.email}</p>
<p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
<br>
<p><strong>Message:</strong></p>
<p>${data.message.replace(/\n/g, '<br>')}</p>
      `
    };

    console.log('Attempting to send email...');
    const result = await sgMail.send(msg);
    console.log('Email sent successfully:', result);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' })
    };
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      response: error.response?.body,
      code: error.code,
      stack: error.stack
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message,
        response: error.response?.body,
        code: error.code
      })
    };
  }
}; 