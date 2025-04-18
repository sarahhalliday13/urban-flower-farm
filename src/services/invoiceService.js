// invoiceService.js
import { getFirebase } from './firebase'; // Import your firebase config
import { getFunctions, httpsCallable } from 'firebase/functions';
import { generateInvoiceHTML } from '../components/Invoice'; // Import if you have this function

// Get Firebase functions instance
const functions = getFunctions();

// Create a callable reference to the Firebase function
const sendInvoiceEmailCallable = httpsCallable(functions, 'sendInvoiceEmailCallable');

/**
 * Send an invoice email using Firebase callable function
 * @param {Object} order - The order object
 * @returns {Promise<Object>} - Result of the email operation
 */
export const sendInvoiceEmail = async (order) => {
  console.log("🔍 INVOICE EMAIL DEBUG - Starting with order:", order);
  
  try {
    if (!order || !order.id) {
      console.error('🚨 INVOICE ERROR - Invalid order provided to sendInvoiceEmail:', order);
      throw new Error('Invalid order data');
    }

    // Check if invoice email was already sent (optional local check)
    if (order.invoiceEmailSent === true) {
      console.log(`🔍 INVOICE DEBUG - Invoice email already marked as sent for order ${order.id}`);
      return {
        success: true,
        message: 'Invoice email already sent for this order',
        alreadySent: true
      };
    }

    console.log(`🔍 INVOICE DEBUG - Sending invoice email for order: ${order.id}`);
    
    // Prepare data for the callable function
    const invoiceData = {
      orderId: order.id,
      customerEmail: order.customer?.email || order.email || order.customerEmail,
      items: order.items || [],
      total: order.total || 0,
      // You can include any other order data needed for the invoice
    };
    
    // Generate invoice HTML if needed
    if (typeof generateInvoiceHTML === 'function') {
      invoiceData.invoiceHtml = generateInvoiceHTML(order);
    }
    
    // Log the payload we're about to send
    console.log('🔍 INVOICE DEBUG - Sending invoice payload:', JSON.stringify(invoiceData, null, 2));
    console.log('🔍 INVOICE DEBUG - Customer email specifically:', invoiceData.customerEmail);
    
    // Call the Firebase function
    console.log('🔍 INVOICE DEBUG - About to call sendInvoiceEmailCallable');
    const result = await sendInvoiceEmailCallable(invoiceData);
    
    console.log('🔍 INVOICE DEBUG - Raw result from Firebase:', result);
    console.log('🔍 INVOICE DEBUG - Result data:', result?.data || 'NO DATA RETURNED');
    
    if (result && result.data && result.data.success) {
      return {
        success: true,
        message: 'Invoice email sent successfully',
        data: result.data
      };
    } else {
      throw new Error(result?.data?.message || 'Failed to send invoice email - No response from Firebase function');
    }
  } catch (error) {
    console.error('🚨 INVOICE ERROR - Error sending invoice email:', error?.message || error);
    console.error('🚨 INVOICE ERROR - Full error object:', error);
    
    // Try to extract the most meaningful error message
    let errorMessage = 'Failed to send invoice email';
    
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.details) {
      errorMessage = error.details;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}; 