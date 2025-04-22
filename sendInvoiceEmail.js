// functions/sendInvoiceEmail.js
const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');

// Initialize Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Use environment or config variable for API Key
const SENDGRID_API_KEY = functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY;
const VERIFIED_SENDER = 'invoice@buttonsflowerfarm.ca'; // Verified sender email

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.error('❌ SendGrid API Key missing! Invoice emails will fail.');
}

// Export as a callable function (onCall)
exports.sendInvoiceEmail = functions.https.onCall(async (data, context) => {
  try {
    const { to, subject, html, orderId, isStandalone } = data;

    if (!to || !subject || !html) {
      console.error('❌ Invoice Email Missing Required Fields:', { to, subject, html });
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: to, subject, html');
    }

    if (!orderId) {
      console.error('❌ Invoice Email Missing Order ID');
      throw new functions.https.HttpsError('invalid-argument', 'Missing order ID');
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
    return { data: { success: true, message: 'Invoice email sent successfully' } };

  } catch (error) {
    console.error('🔥 Invoice Email Failed:', error?.response?.body || error.message || error);
    throw new functions.https.HttpsError('internal', error.message || 'Unknown error sending invoice');
  }
});
