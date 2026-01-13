const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Initialize Admin
if (!admin.apps.length) {
  admin.initializeApp();
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

    // Create transporter with Gmail SMTP settings
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "buttonsflowerfarm@gmail.com",
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP connection successful");

    const msg = {
      to,
      from: "buttonsflowerfarm@gmail.com",
      subject,
      html,
    };

    console.log('📬 Sending Invoice Email:', JSON.stringify(msg, null, 2));

    const result = await transporter.sendMail(msg);

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
