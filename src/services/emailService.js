// emailService.js

// We're not using Firebase functions directly for emails anymore
// since they're failing with 500 errors

// Define the API base URL based on environment
const getApiUrl = () => {
  // Use the environment variable if available, fallback to production URL
  return process.env.REACT_APP_FIREBASE_FUNCTIONS_URL || 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net';
};

// Send order confirmation emails
export const sendOrderConfirmationEmails = async (orderData) => {
  try {
    if (!orderData || !orderData.id) {
      console.error('Invalid order data provided to sendOrderConfirmationEmails:', orderData);
      return {
        success: false,
        message: 'Invalid order data provided'
      };
    }
    
    // Try to send email via Firebase Function
    try {
      const apiUrl = getApiUrl();
      console.log(`Sending order confirmation email via: ${apiUrl}/sendOrderEmail`);
      
      // Send the order data without any special flags
      const response = await fetch(`${apiUrl}/sendOrderEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(orderData),
      });
      
      const data = await response.json();
      console.log('Email API response:', data);
      
      if (response.ok && data.success) {
        console.log('Order confirmation email sent successfully');
        return {
          success: true,
          message: 'Order confirmation email sent successfully',
          data
        };
      } else {
        throw new Error(data.error || data.details || 'Failed to send order confirmation email');
      }
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      return {
        success: false,
        message: error.message || 'Failed to send order confirmation email',
      };
    }
  } catch (error) {
    console.error('Error in email service:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred in the email service',
    };
  }
};

// Send invoice email - dedicated function to use the new invoice email endpoint
export const sendInvoiceEmail = async (orderData) => {
  console.warn('DEPRECATED: Please use the invoiceService.sendInvoiceEmail function instead');
  console.warn('This function uses the old HTTP API method and may be removed in the future');
  console.warn('Import from: import { sendInvoiceEmail } from "../services/invoiceService"');
  
  // Forward to the appropriate implementation in invoiceService
  try {
    // Dynamically import to avoid circular dependencies
    const invoiceModule = await import('./invoiceService');
    return invoiceModule.sendInvoiceEmail(orderData);
  } catch (error) {
    console.error('Failed to redirect to invoiceService:', error);
    return {
      success: false,
      message: 'Email service has been updated. Please refresh the page and try again.',
    };
  }
};

// Send contact form email
export const sendContactFormEmail = async (formData) => {
  try {
    // Try to send email via Firebase Function
    try {
      const apiUrl = getApiUrl();
      
      // Use our new direct contact email function
      console.log(`Sending contact form email via: ${apiUrl}/directContactEmail`);
      
      const response = await fetch(`${apiUrl}/directContactEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(formData),
      });
      
      // Extra logging
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      
      // Handle non-JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Non-JSON response received');
        const textResponse = await response.text();
        console.log('Text response:', textResponse);
        if (response.ok) {
          return {
            success: true,
            message: 'Your message has been sent successfully.',
            data: { text: textResponse }
          };
        } else {
          throw new Error(textResponse || 'Failed to send contact form');
        }
      }
      
      const data = await response.json();
      console.log('Contact form API response:', data);
      
      if (response.ok && data.success) {
        console.log('Contact form email sent successfully');
        return {
          success: true,
          message: 'Your message has been sent successfully.',
          data
        };
      } else {
        throw new Error(data.error || data.details || 'Failed to send contact form');
      }
    } catch (apiError) {
      console.error('Error calling contact form API:', apiError);
      
      // Fall back to localStorage as a fallback
      const contactSubmissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
      contactSubmissions.push({
        ...formData,
        date: new Date().toISOString(),
        status: 'pending',
        error: apiError.message
      });
      localStorage.setItem('contactSubmissions', JSON.stringify(contactSubmissions));
      
      return {
        success: false,
        message: 'Email service is currently unavailable. Your message has been saved and will be processed manually.',
        error: apiError.message
      };
    }
  } catch (error) {
    console.error('Error handling contact form submission:', error);
    return {
      success: false,
      message: 'Could not process your contact form submission.'
    };
  }
};
