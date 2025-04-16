// emailService.js

// We're not using Firebase functions directly for emails anymore
// since they're failing with 500 errors

// Define the API base URL based on environment
const getApiUrl = () => {
  const hostname = window.location.hostname;

  if (hostname.includes('localhost')) {
    return 'http://localhost:5002/buttonsflowerfarm-8a54d/us-central1';
  } else if (hostname.includes('urban-flower-farm-staging.web.app')) {
    return 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net';
  } else {
    return 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net';
  }
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
    
    const isInvoiceEmail = orderData.isInvoiceEmail === true;
    
    console.log(`Request to send ${isInvoiceEmail ? 'invoice' : 'order confirmation'} for order: ${orderData.id}`);
    
    // Only check emailSent flag for order confirmation emails, not for invoice emails
    if (!isInvoiceEmail && orderData.emailSent === true) {
      console.log(`Email already sent for order ${orderData.id}, skipping frontend send`);
      return {
        success: true,
        message: 'Email already sent for this order',
        alreadySent: true
      };
    }
    
    // Try to send email via Firebase Function
    try {
      const apiUrl = getApiUrl();
      console.log(`Sending ${isInvoiceEmail ? 'invoice' : 'order'} email via: ${apiUrl}/sendOrderEmail`);
      
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
        console.log(`${isInvoiceEmail ? 'Invoice' : 'Order confirmation'} email sent successfully`);
        return {
          success: true,
          message: data.alreadySent && !isInvoiceEmail 
            ? 'Email was already sent for this order' 
            : `${isInvoiceEmail ? 'Invoice' : 'Order confirmation'} email sent successfully`,
          data
        };
      } else {
        throw new Error(data.error || data.details || `Failed to send ${isInvoiceEmail ? 'invoice' : 'order'} email`);
      }
    } catch (error) {
      console.error(`Error sending ${isInvoiceEmail ? 'invoice' : 'order'} email:`, error);
      return {
        success: false,
        message: error.message || `Failed to send ${isInvoiceEmail ? 'invoice' : 'order'} email`,
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
