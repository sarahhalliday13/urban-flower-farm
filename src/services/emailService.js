// const sgMail = require('@sendgrid/mail');

// Determine API URL based on environment
const isProduction = process.env.NODE_ENV === 'production';
const API_URL = isProduction 
  ? '' // Empty prefix for production - will use relative paths directly
  : 'http://localhost:8888'; // For local dev testing with Netlify Dev

/**
 * Displays a success message to the user based on whether we're in dev or production
 * @param {Object} responseData - The data returned from the API
 * @param {boolean} isDevelopment - Whether we're in development mode
 * @returns {string} - A user-friendly message
 */
const getSuccessMessage = (responseData, isDevelopment = false) => {
  if (isDevelopment && responseData.message && responseData.message.includes('DEVELOPMENT MODE')) {
    return 'Email sending simulated successfully (development mode)';
  }
  return 'Email sent successfully';
};

/**
 * Sends order confirmation emails to customer and business owner
 * @param {Object} order - The order object containing all order information
 * @returns {Promise<boolean>} - True if emails sent successfully
 */
export const sendOrderConfirmationEmails = async (order) => {
  try {
    const endpoint = '/api/email/order';
    console.log(`Sending order email to: ${API_URL}${endpoint}`);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order)
    });

    const responseData = await response.json().catch(() => ({}));
    console.log('Email API response:', responseData);

    if (!response.ok) {
      throw new Error(responseData.error || responseData.details || `Failed to send emails: ${response.status} ${response.statusText}`);
    }

    // Check if this is a development mode simulated response
    const isDevelopment = responseData.message && responseData.message.includes('DEVELOPMENT MODE');
    console.log(isDevelopment ? 'Development mode email simulation' : 'Production email sent');
    
    return {
      success: true,
      message: getSuccessMessage(responseData, isDevelopment),
      data: responseData
    };
  } catch (error) {
    console.error('Error sending order confirmation emails:', error);
    throw error;
  }
};

/**
 * Sends contact form email to business owner
 * @param {Object} formData - The contact form data
 * @returns {Promise<boolean>} - True if email sent successfully
 */
export const sendContactFormEmail = async (formData) => {
  try {
    const endpoint = '/api/email/contact';
    console.log(`Sending contact form email to: ${API_URL}${endpoint}`);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    const responseData = await response.json().catch(() => ({}));
    console.log('Email API response:', responseData);

    if (!response.ok) {
      throw new Error(responseData.error || responseData.details || `Failed to send email: ${response.status} ${response.statusText}`);
    }

    // Check if this is a development mode simulated response
    const isDevelopment = responseData.message && responseData.message.includes('DEVELOPMENT MODE');
    console.log(isDevelopment ? 'Development mode email simulation' : 'Production email sent');
    
    return {
      success: true,
      message: getSuccessMessage(responseData, isDevelopment),
      data: responseData
    };
  } catch (error) {
    console.error('Error sending contact form email:', error);
    throw error; // Re-throw to handle in the component
  }
}; 