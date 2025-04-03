const sgMail = require('@sendgrid/mail');

const BUTTONS_EMAIL = 'Buttonsflowerfarm@gmail.com';

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Initialize SendGrid
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        console.error('SendGrid API key is missing');
        throw new Error('SendGrid API key is missing');
      }
      
      // Log sanitized key info for debugging
      console.log('API Key validation:', {
        keyExists: !!apiKey,
        keyStartsWithSG: apiKey.startsWith('SG.'),
        keyLength: apiKey.length
      });
      
      sgMail.setApiKey(apiKey);
    } catch (apiError) {
      console.error('SendGrid API key error:', apiError.message);
      throw new Error('Failed to initialize SendGrid: ' + apiError.message);
    }

    // Handle contact form submission
    if (data.name && data.email && data.message) {
      const msg = {
        to: BUTTONS_EMAIL,
        from: BUTTONS_EMAIL, // Must be verified sender in SendGrid
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

      try {
        const result = await sgMail.send(msg);
        console.log('Contact form email sent successfully:', result);
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Contact form email sent successfully' })
        };
      } catch (sendError) {
        console.error('Error sending contact form email:', sendError);
        if (sendError.response) {
          console.error('SendGrid response:', sendError.response.body);
        }
        throw new Error('Failed to send contact form email: ' + sendError.message);
      }
    }
    
    // Handle order confirmation emails
    if (data.orderId && data.customer) {
      console.log('Received order confirmation request. Processing...');
      // Complete implementation in functions/sendOrderEmail.js
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Order confirmation request received. Redirecting to dedicated endpoint.',
          redirectTo: '/sendOrderEmail'
        })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request data' })
    };
  } catch (error) {
    console.error('Error in email function:', {
      message: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: error.code || 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}; 