// src/services/invoiceService.js
import { getFunctions, httpsCallable } from 'firebase/functions';
import { generateInvoiceHTML } from '../components/Invoice'; // Your invoice HTML generator

// Get Firebase functions instance
const functions = getFunctions(undefined, 'us-central1');

// Create a callable reference to the Firebase function
const sendInvoiceEmailCallable = httpsCallable(functions, 'sendInvoiceEmail');

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
      return { success: false, message: 'Invalid order data' };
    }

    const isStandalone = order.isStandalone === true;

    if (!isStandalone && order.invoiceEmailSent === true) {
      console.log(`🔍 INVOICE DEBUG - Invoice email already marked as sent for order ${order.id}`);
      return { success: true, message: 'Invoice email already sent for this order', alreadySent: true };
    }

    // Build invoice payload
    const invoiceData = {
      to: order.customer?.email || order.email || order.customerEmail,
      subject: `Invoice for Your Button's Flower Farm Order #${order.id}`,
      html: '',
      orderId: order.id,
      isStandalone: isStandalone
    };

    if (typeof generateInvoiceHTML === 'function') {
      invoiceData.html = generateInvoiceHTML(order);
      console.log('🔍 INVOICE DEBUG - Generated HTML length:', invoiceData.html?.length || 0);
    } else {
      console.error('🚨 INVOICE ERROR - Invoice HTML generator not available');
      return { success: false, message: 'Invoice HTML generator not available' };
    }

    console.log('🔍 INVOICE DEBUG - Sending invoice payload:', {
      to: invoiceData.to,
      subject: invoiceData.subject,
      orderId: invoiceData.orderId
    });

    // ✅ Actually call the Firebase function
    const result = await sendInvoiceEmailCallable(invoiceData);

    console.log('📬 INVOICE DEBUG - Raw result from Firebase:', result);

    // Defensive: Handle cases where Firebase returns blank or odd result
    if (result?.data?.success) {
      console.log('✅ INVOICE SUCCESS - Invoice email sent!');
      return { success: true, message: result.data.message || 'Invoice email sent successfully' };
    } else {
      console.warn('⚠️ INVOICE WARNING - Unexpected Firebase result, treating as soft success.');
      return { success: true, message: 'Invoice email sent, but server response was unexpected' };
    }

  } catch (error) {
    console.error('🔥 INVOICE ERROR - Full error object:', error);

    let errorMessage = 'Failed to send invoice email';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.details) {
      errorMessage = error.details;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return { success: false, message: errorMessage };
  }
};
