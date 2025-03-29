// const sgMail = require('@sendgrid/mail');

// Get the API URL based on environment
const getApiUrl = () => {
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // For local development, use the netlify dev server port 8888
  if (isLocalDev) {
    return 'http://localhost:8888/.netlify/functions';
  }
  
  // For production, use the relative path to the Netlify functions
  return '/.netlify/functions';
};

// Success message helper
const getSuccessMessage = (response) => {
  // Check if this is a development mode simulated response
  if (response?.message && response.message.includes('DEVELOPMENT MODE')) {
    return 'Email simulated successfully in development mode';
  }
  return 'Email sent successfully';
};

// Send order confirmation emails
export const sendOrderConfirmationEmails = async (orderData) => {
  try {
    const apiUrl = getApiUrl();
    console.log(`Sending order email via: ${apiUrl}/send-order-email`);
    
    const response = await fetch(`${apiUrl}/send-order-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    
    const data = await response.json();
    console.log('Order email API response:', data);
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send order emails');
    }
    
    return {
      success: true,
      message: getSuccessMessage(data),
      data
    };
  } catch (error) {
    console.error('Error sending order emails:', error);
    return {
      success: false,
      message: error.message || 'Failed to send order emails',
    };
  }
};

// Send contact form email
export const sendContactFormEmail = async (formData) => {
  try {
    const apiUrl = getApiUrl();
    console.log(`Sending contact form email via: ${apiUrl}/send-contact-email`);
    
    const response = await fetch(`${apiUrl}/send-contact-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    
    const data = await response.json();
    console.log('Contact form API response:', data);
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send contact form email');
    }
    
    return {
      success: true,
      message: getSuccessMessage(data),
      data
    };
  } catch (error) {
    console.error('Error sending contact form email:', error);
    return {
      success: false,
      message: error.message || 'Failed to send contact form email',
    };
  }
}; 