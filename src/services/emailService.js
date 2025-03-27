// const sgMail = require('@sendgrid/mail');

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const sendOrderConfirmationEmails = async (order) => {
  try {
    // Use the backend endpoint for sending emails
    const response = await fetch(`${API_URL}/api/email/order`, {
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
    // Use the backend endpoint for sending emails
    const response = await fetch(`${API_URL}/api/email/contact`, {
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