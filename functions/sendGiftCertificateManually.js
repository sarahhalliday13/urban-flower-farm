const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { generateCertificatePDF } = require('./generateCertificatePDF');

/**
 * Firebase Function to manually send gift certificates
 * Called by admin from the dashboard when payment is verified
 */
exports.sendGiftCertificateManually = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300
  })
  .https.onCall(async (data, context) => {
  
  try {
    // Verify user is authenticated (optional: add admin role check)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { certificateCode, adminUserId } = data;
    
    if (!certificateCode) {
      throw new functions.https.HttpsError('invalid-argument', 'Certificate code is required');
    }

    console.log(`📧 Manual send request for certificate: ${certificateCode} by admin: ${adminUserId || context.auth.uid}`);

    // Get certificate from database
    const certificateRef = admin.database().ref(`giftCertificates/${certificateCode}`);
    const snapshot = await certificateRef.once('value');
    
    if (!snapshot.exists()) {
      throw new functions.https.HttpsError('not-found', 'Certificate not found');
    }

    const certificate = snapshot.val();
    
    // Check if certificate is in pending status
    if (certificate.emailStatus !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', `Certificate is already ${certificate.emailStatus}`);
    }

    console.log('📋 Certificate data:', {
      code: certificate.certificateCode,
      recipient: certificate.recipientName,
      email: certificate.recipientEmail || certificate.customerEmail,
      amount: certificate.amount
    });

    // Generate PDF
    console.log('🎯 Generating PDF for manual send...');
    const pdfBuffer = await generateCertificatePDF({
      ...certificate,
      dateCreated: certificate.dateCreated
    });

    // Send email to recipient
    await sendManualCertificateEmail(certificate, pdfBuffer);

    // Update certificate status
    const now = new Date().toISOString();
    await certificateRef.update({
      emailStatus: 'sent',
      emailSentDate: now,
      emailSentBy: adminUserId || context.auth.uid,
      lastModified: now
    });

    console.log(`✅ Certificate ${certificateCode} sent successfully`);

    return {
      success: true,
      message: `Gift certificate sent to ${certificate.recipientEmail || certificate.customerEmail}`,
      sentDate: now
    };

  } catch (error) {
    console.error('❌ Error sending certificate manually:', error);
    
    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Otherwise, wrap in internal error
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Sends gift certificate email to recipient
 * @param {Object} certificate - The certificate data
 * @param {Buffer} pdfBuffer - The PDF buffer
 */
async function sendManualCertificateEmail(certificate, pdfBuffer) {
  try {
    console.log('📧 Sending gift certificate email to recipient');

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "buttonsflowerfarm@telus.net",
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP connection successful");

    // Determine recipient email
    const recipientEmail = certificate.recipientEmail || certificate.customerEmail;
    const senderFirstName = certificate.senderName?.split(' ')[0] || 'Someone';
    const emailSubject = `${senderFirstName} sent you a gift certificate`;

    // Generate email content
    const emailHtml = generateManualCertificateEmailTemplate(certificate);
    
    // Prepare attachment
    const attachment = {
      filename: `Gift_Certificate_${certificate.certificateCode}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    };

    console.log('📧 Sending to:', recipientEmail, 'Subject:', emailSubject);
    
    // Send email to recipient
    const emailInfo = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      attachments: [attachment]
    });

    console.log("✅ Gift certificate email sent successfully:", emailInfo.messageId);

    // Send confirmation to buyer
    if (certificate.recipientEmail && certificate.recipientEmail !== certificate.customerEmail) {
      await transporter.sendMail({
        from: "buttonsflowerfarm@telus.net",
        to: certificate.customerEmail,
        subject: `Gift Certificate Sent - ${certificate.certificateCode}`,
        html: generateBuyerNotificationEmailTemplate(certificate)
      });
      console.log("✅ Buyer notification sent");
    }

  } catch (error) {
    console.error('❌ Error sending certificate email:', error);
    throw error;
  }
}

/**
 * Generates the email template for manually sent certificates
 * @param {Object} certificate - The certificate data
 * @return {string} HTML email template
 */
function generateManualCertificateEmailTemplate(certificate) {
  const senderFirstName = certificate.senderName?.split(' ')[0] || 'Someone';
  const recipientName = certificate.recipientName || 'Friend';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Gift Certificate - Buttons Urban Flower Farm</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #2c5530; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { height: 80px; margin-bottom: 15px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/logo%2Fbuff_floral_lg.png?alt=media&token=3dfddfc2-6579-4541-acc3-6e3a02aea0b5" 
               alt="Buttons Urban Flower Farm" class="logo">
          <h1 style="color: #2c5530; margin: 0;">Your Gift Certificate</h1>
        </div>

        <p>Dear ${recipientName},</p>
        
        <p>${senderFirstName} sent you a gift certificate to Buttons Urban Flower Farm. The PDF is attached to this email. Come and enjoy some flowers! Check out our website at http://www.buttonsflowerfarm.ca</p>
        
        <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #2c5530; margin-top: 0;">How to Use Your Gift Certificate</h3>
          <ul>
            <li>Present the certificate code when shopping</li>
            <li>Valid for 1 year from purchase date</li>
            <li>Can be used for partial purchases (remaining balance preserved)</li>
            <li>Not redeemable for cash</li>
            <li>Contact us if you need to check your balance</li>
          </ul>
        </div>

        <p>If you have any questions about your gift certificate, please don't hesitate to contact us.</p>
        
        <div class="footer">
          <p><strong>Buttons Urban Flower Farm</strong><br>
          Email: buttonsflowerfarm@telus.net</p>
          
          <p style="font-style: italic;">Thank you for supporting our local flower farm!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates the buyer notification email template
 * @param {Object} certificate - The certificate data
 * @return {string} HTML email template
 */
function generateBuyerNotificationEmailTemplate(certificate) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Gift Certificate Sent - Buttons Urban Flower Farm</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 style="color: #2c5530;">Gift Certificate Delivered!</h2>
        
        <p>Great news! Your gift certificate has been successfully sent to the recipient.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Delivery Details:</h3>
          <ul>
            <li><strong>Certificate Code:</strong> ${certificate.certificateCode}</li>
            <li><strong>Amount:</strong> $${certificate.amount.toFixed(2)}</li>
            <li><strong>Recipient:</strong> ${certificate.recipientName}</li>
            <li><strong>Sent to:</strong> ${certificate.recipientEmail}</li>
            <li><strong>Delivered:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
        </div>
        
        <p>The recipient has received the gift certificate as a PDF attachment and can now use it at our flower farm.</p>
        
        <p>Thank you for choosing Buttons Urban Flower Farm!</p>
        
        <p style="color: #666; font-size: 0.9rem;">
          Buttons Urban Flower Farm<br>
          buttonsflowerfarm@telus.net
        </p>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendGiftCertificateManually: exports.sendGiftCertificateManually
};