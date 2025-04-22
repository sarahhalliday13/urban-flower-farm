const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');

// Initialize Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// SendGrid Setup
const SENDGRID_API_KEY = functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY;
const VERIFIED_SENDER = 'invoice@buttonsflowerfarm.ca';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.error('❌ SendGrid API Key missing! Invoice emails will fail.');
}

// 💥 Your fixed callable function starts here:
exports.sendInvoiceEmail = functions.https.onCall(async (data, context) => {
  try {
    const { to, subject, html, orderId, isStandalone } = data;

    console.log('📦 Received payload at function:', { to, subject, htmlLength: html?.length, orderId, isStandalone });

    if (!to || !subject || !html) {
      console.error('❌ Invoice Email Missing Required Fields:', { to, subject, html });
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: to, subject, html');
    }

    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      console.error('❌ Invoice Email Missing or Invalid Order ID:', { orderId });
      throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid order ID');
    }

    const msg = {
      to,
      from: VERIFIED_SENDER,
      subject,
      html,
    };

    console.log('📬 Sending Invoice Email:', JSON.stringify(msg, null, 2));

    const result = await sgMail.send(msg);

    console.log('✅ Invoice Email Sent Successfully!', result);

    return {
      data: {
        success: true,
        message: 'Invoice email sent successfully'
      }
    };

  } catch (error) {
    console.error('🔥 Invoice Email Failed:', error?.response?.body || error.message || error);
    throw new functions.https.HttpsError('internal', error.message || 'Unknown error sending invoice');
  }
});
