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
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

      await sgMail.send(msg);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Contact form email sent successfully' })
      };
    }
    
    // Handle order confirmation emails
    if (data.orderId && data.customer) {
      // ... existing order email logic ...
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Order confirmation emails sent successfully' })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request data' })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: error.code || 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}; 