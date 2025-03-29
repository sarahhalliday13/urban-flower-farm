// const sgMail = require('@sendgrid/mail');

// Determine API URL based on environment
const isProduction = process.env.NODE_ENV === 'production';
const API_URL = isProduction 
  ? '/.netlify/functions' 
  : (process.env.REACT_APP_SERVER_URL || 'http://localhost:3001');

export const sendOrderConfirmationEmails = async (order) => {
  try {
    // Use the appropriate endpoint for the environment
    const endpoint = isProduction ? '/send-order-email' : '/api/email/order';
    console.log(`Using endpoint for order email: ${API_URL}${endpoint}`);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send emails');
    }

    return true;
  } catch (error) {
    console.error('Error sending order confirmation emails:', error);
    throw error;
  }
};

export const sendContactFormEmail = async (formData) => {
  try {
    // Use the appropriate endpoint for the environment
    const endpoint = isProduction ? '/send-contact-email' : '/api/email/contact';
    console.log(`Using endpoint for contact email: ${API_URL}${endpoint}`);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Error sending contact form email:', error);
    throw error; // Re-throw to handle in the component
  }
}; 