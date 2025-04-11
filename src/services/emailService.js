// emailService.js

// We're not using Firebase functions directly for emails anymore
// since they're failing with 500 errors

// Define the API base URL based on environment
const getApiUrl = () => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalhost 
    ? 'http://localhost:5002/buttonsflowerfarm-8a54d/us-central1' 
    : 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net';
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
    
    console.log(`Sending order confirmation for order: ${orderData.id}`);
    
    // Try to send email via Firebase Function
    try {
      const apiUrl = getApiUrl();
      console.log(`Sending order email via: ${apiUrl}/sendOrderEmail`);
      
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
      console.log('Order email API response:', data);
      
      if (response.ok && data.success) {
        console.log('Order confirmation emails sent successfully');
        return {
          success: true,
          message: 'Order confirmation emails sent successfully',
          data
        };
      } else {
        throw new Error(data.error || data.details || 'Failed to send order emails');
      }
    } catch (apiError) {
      console.error('Error calling email API:', apiError);
      
      // Fall back to localStorage queue if API call fails
      console.log('Falling back to localStorage queue for manual sending');
      
      // Store the order information for later sending by admin
      const pendingEmails = JSON.parse(localStorage.getItem('pendingOrderEmails') || '[]');
      
      // Check if we already have this order in pending emails
      const existingEmailIndex = pendingEmails.findIndex(item => item.orderId === orderData.id);
      
      if (existingEmailIndex >= 0) {
        // Update existing entry
        pendingEmails[existingEmailIndex] = {
          ...pendingEmails[existingEmailIndex],
          orderId: orderData.id,
          customerEmail: orderData.customer.email,
          customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
          orderDate: orderData.date,
          timestamp: Date.now(),
          attempts: (pendingEmails[existingEmailIndex].attempts || 0) + 1,
          lastAttempt: new Date().toISOString(),
          error: apiError.message
        };
      } else {
        // Add new entry
        pendingEmails.push({
          orderId: orderData.id,
          customerEmail: orderData.customer.email,
          customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
          orderDate: orderData.date,
          timestamp: Date.now(),
          attempts: 1,
          lastAttempt: new Date().toISOString(),
          error: apiError.message
        });
      }
      
      localStorage.setItem('pendingOrderEmails', JSON.stringify(pendingEmails));
      console.log(`Order ${orderData.id} added to pending emails queue for manual sending`);
      
      // Track emails that need to be manually sent in a separate collection for the admin
      const manualEmails = JSON.parse(localStorage.getItem('manualEmails') || '[]');
      
      if (!manualEmails.find(item => item.orderId === orderData.id)) {
        manualEmails.push({
          orderId: orderData.id,
          customerEmail: orderData.customer.email,
          customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
          status: 'pending',
          date: new Date().toISOString(),
          error: apiError.message
        });
        
        localStorage.setItem('manualEmails', JSON.stringify(manualEmails));
      }
      
      // Return success: false to indicate email was not actually sent
      // but we have handled it gracefully
      return {
        success: false,
        message: 'Email service unavailable. Order tracked for manual email sending.',
        pendingEmailSaved: true,
        error: apiError.message
      };
    }
  } catch (error) {
    console.error('Error in sendOrderConfirmationEmails:', error);
    
    // Final fallback - just track that we need to send an email
    try {
      const pendingEmails = JSON.parse(localStorage.getItem('pendingOrderEmails') || '[]');
      pendingEmails.push({
        orderId: orderData.id,
        timestamp: Date.now(),
        attempts: 1,
        error: error.message
      });
      localStorage.setItem('pendingOrderEmails', JSON.stringify(pendingEmails));
      console.log('Stored order in pendingOrderEmails for later retry');
    } catch (e) {
      console.error('Failed to store pending email:', e);
    }
    
    return {
      success: false,
      message: 'Could not send order confirmation emails. Will retry later.',
      error: error.message
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
