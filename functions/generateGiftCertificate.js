const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { generateCertificatePDF } = require('./generateCertificatePDF');
const { createCertificate } = require('./certificateService');

/**
 * Firebase Function to generate gift certificates and send them via email
 * Triggered when an order contains gift certificate items
 */
exports.generateGiftCertificate = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300 // 5 minutes for PDF generation
  })
  .https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    return;
  }

  try {
    const { orderData, giftCertificates } = req.body;
    
    if (!orderData || !giftCertificates || !Array.isArray(giftCertificates)) {
      throw new Error('Invalid request data');
    }

    console.log(`🎁 Processing ${giftCertificates.length} gift certificate(s) for order ${orderData.id}`);

    const processedCertificates = [];

    // Process each gift certificate
    for (const giftCert of giftCertificates) {
      try {
        console.log(`📜 Processing certificate: $${giftCert.amount}`);
        
        // Create certificate record in database
        const certificateData = {
          orderId: orderData.id,
          amount: giftCert.amount,
          recipientName: giftCert.recipientName || `${orderData.customer.firstName} ${orderData.customer.lastName}`,
          recipientEmail: giftCert.recipientEmail || '',
          senderName: giftCert.senderName || `${orderData.customer.firstName} ${orderData.customer.lastName}`,
          giftMessage: giftCert.giftMessage || '',
          customerEmail: orderData.customer.email
        };

        const certificate = await createCertificate(certificateData);
        
        // Generate PDF
        const pdfBuffer = await generateCertificatePDF({
          ...certificate,
          dateCreated: certificate.dateCreated
        });

        processedCertificates.push({
          certificate,
          pdfBuffer,
          filename: `Gift_Certificate_${certificate.certificateCode}.pdf`
        });

        console.log(`✅ Certificate generated successfully: ${certificate.certificateCode}`);

      } catch (error) {
        console.error(`❌ Error processing certificate:`, error);
        // Continue processing other certificates even if one fails
      }
    }

    if (processedCertificates.length === 0) {
      throw new Error('No certificates were successfully processed');
    }

    // Send order confirmation email to buyer (not the recipient)
    await sendBuyerConfirmationEmail(orderData, processedCertificates);

    res.status(200).json({
      success: true,
      message: `Successfully generated and sent ${processedCertificates.length} gift certificate(s)`,
      certificates: processedCertificates.map(pc => ({
        code: pc.certificate.certificateCode,
        amount: pc.certificate.amount
      }))
    });

  } catch (error) {
    console.error('❌ Error in generateGiftCertificate function:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Sends gift certificate email with PDF attachments
 * @param {Object} orderData - The order data
 * @param {Array} certificates - Array of processed certificates with PDFs
 */
async function sendCertificateEmail(orderData, certificates) {
  try {
    console.log('📧 Sending gift certificate email');

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

    // Prepare attachments
    const attachments = certificates.map(cert => ({
      filename: cert.filename,
      content: cert.pdfBuffer,
      contentType: 'application/pdf'
    }));

    // Generate email content
    const emailHtml = generateCertificateEmailTemplate(orderData, certificates);
    const senderFirstName = certificates[0]?.certificate.senderName?.split(' ')[0] || 'Someone';
    const emailSubject = `${senderFirstName} sent you a gift certificate`;
    
    console.log('📧 EMAIL DEBUG - Subject:', emailSubject);
    console.log('📧 EMAIL DEBUG - Recipient:', certificates[0]?.certificate.recipientEmail || orderData.customer.email);
    console.log('📧 EMAIL DEBUG - Sender first name:', senderFirstName);

    // Determine email recipient - send to recipientEmail if provided, otherwise to customer
    const recipientEmail = certificates[0]?.certificate.recipientEmail || orderData.customer.email;
    
    // Send email
    const emailInfo = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      attachments: attachments
    });

    console.log("✅ Gift certificate email sent successfully:", emailInfo.messageId);

    // Also send copy to admin
    await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: "buttonsflowerfarm@telus.net",
      subject: `Gift Certificate Order - ${orderData.id}`,
      html: generateAdminCertificateEmailTemplate(orderData, certificates),
      attachments: attachments
    });

    console.log("✅ Admin copy sent successfully");

  } catch (error) {
    console.error('❌ Error sending certificate email:', error);
    throw error;
  }
}

/**
 * Sends order confirmation email to buyer (not the recipient)
 * @param {Object} orderData - The order data
 * @param {Array} certificates - Array of processed certificates with PDFs
 */
async function sendBuyerConfirmationEmail(orderData, certificates) {
  try {
    console.log('📧 Sending buyer confirmation email');

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

    // Generate email content for buyer
    const emailHtml = generateBuyerConfirmationEmailTemplate(orderData, certificates);
    const emailSubject = `Gift Certificate Order Received - ${orderData.id}`;
    
    console.log('📧 BUYER EMAIL - Subject:', emailSubject);
    console.log('📧 BUYER EMAIL - Recipient:', orderData.customer.email);
    
    // Send confirmation to buyer
    const emailInfo = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: orderData.customer.email,
      subject: emailSubject,
      html: emailHtml
    });

    console.log("✅ Buyer confirmation email sent successfully:", emailInfo.messageId);

    // Send notification to admin with certificate details
    await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: "buttonsflowerfarm@telus.net",
      subject: `New Gift Certificate Order - ${orderData.id} (Pending Send)`,
      html: generateAdminPendingCertificateEmailTemplate(orderData, certificates)
    });

    console.log("✅ Admin notification sent successfully");

  } catch (error) {
    console.error('❌ Error sending buyer confirmation email:', error);
    throw error;
  }
}

/**
 * Generates the customer email template for gift certificates
 * @param {Object} orderData - The order data
 * @param {Array} certificates - Array of certificates
 * @return {string} HTML email template
 */
function generateCertificateEmailTemplate(orderData, certificates) {
  const senderFirstName = certificates[0]?.certificate.senderName?.split(' ')[0] || 'Someone';
  console.log('📧 Generating email template with data:', {
    senderFirstName,
    recipientName: certificates[0]?.certificate.recipientName,
    recipientEmail: certificates[0]?.certificate.recipientEmail,
    orderData: orderData.id
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Gift Certificate(s) - Buttons Urban Flower Farm</title>
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
          <h1 style="color: #2c5530; margin: 0;">Your Gift Certificate${certificates.length > 1 ? 's' : ''}</h1>
        </div>

        <p>Dear ${certificates[0]?.certificate.recipientName || orderData.customer.firstName},</p>
        
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

        <p>If you have any questions about your gift certificate${certificates.length > 1 ? 's' : ''}, please don't hesitate to contact us.</p>
        
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
 * Generates the admin email template for gift certificates
 * @param {Object} orderData - The order data
 * @param {Array} certificates - Array of certificates
 * @return {string} HTML email template
 */
function generateAdminCertificateEmailTemplate(orderData, certificates) {
  const certificatesList = certificates.map(cert => `
    <li>
      <strong>${cert.certificate.certificateCode}</strong> - $${cert.certificate.amount.toFixed(2)} 
      (To: ${cert.certificate.recipientName})
      ${cert.certificate.giftMessage ? `<br><em>Message: "${cert.certificate.giftMessage}"</em>` : ''}
    </li>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c5530;">🎁 Gift Certificate Order Processed</h2>
      
      <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3>Order Information</h3>
        <p><strong>Order ID:</strong> ${orderData.id}</p>
        <p><strong>Customer:</strong> ${orderData.customer.firstName} ${orderData.customer.lastName}</p>
        <p><strong>Email:</strong> ${orderData.customer.email}</p>
        <p><strong>Phone:</strong> ${orderData.customer.phone}</p>
      </div>
      
      <div style="background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3>Generated Certificates</h3>
        <ul>
          ${certificatesList}
        </ul>
      </div>
      
      <p><strong>Total Certificates:</strong> ${certificates.length}</p>
      <p><strong>Total Value:</strong> $${certificates.reduce((sum, cert) => sum + cert.certificate.amount, 0).toFixed(2)}</p>
      
      <p>Certificates have been automatically generated and emailed to the customer.</p>
    </div>
  `;
}

/**
 * Generates the buyer confirmation email template
 * @param {Object} orderData - The order data
 * @param {Array} certificates - Array of certificates
 * @return {string} HTML email template
 */
function generateBuyerConfirmationEmailTemplate(orderData, certificates) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Gift Certificate Order Received - Buttons Urban Flower Farm</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #2c5530; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { height: 80px; margin-bottom: 15px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
        .status-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/logo%2Fbuff_floral_lg.png?alt=media&token=3dfddfc2-6579-4541-acc3-6e3a02aea0b5" 
               alt="Buttons Urban Flower Farm" class="logo">
          <h1 style="color: #2c5530; margin: 0;">Gift Certificate Order Received</h1>
        </div>

        <p>Dear ${orderData.customer.firstName},</p>
        
        <p>Thank you for your gift certificate order! We have successfully received your order and your certificates are being prepared.</p>

        <div class="status-box">
          <h3 style="margin-top: 0; color: #856404;">Order Status: Processing</h3>
          <p>Your gift certificate${certificates.length > 1 ? 's' : ''} will be sent to the recipient once we have confirmed payment. This typically happens within 1 business day.</p>
        </div>

        <h3>Order Details:</h3>
        <ul>
          <li><strong>Order Number:</strong> ${orderData.id}</li>
          <li><strong>Total Certificates:</strong> ${certificates.length}</li>
          <li><strong>Total Value:</strong> $${certificates.reduce((sum, cert) => sum + cert.certificate.amount, 0).toFixed(2)}</li>
        </ul>

        <h3>Certificate Recipients:</h3>
        <ul>
          ${certificates.map(cert => `
            <li>
              <strong>$${cert.certificate.amount.toFixed(2)}</strong> for 
              ${cert.certificate.recipientName || 'Not specified'}
              ${cert.certificate.recipientEmail ? ` (${cert.certificate.recipientEmail})` : ''}
            </li>
          `).join('')}
        </ul>

        <div style="background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h4 style="margin-top: 0;">What happens next?</h4>
          <ol>
            <li>We'll confirm your payment</li>
            <li>Your gift certificate${certificates.length > 1 ? 's' : ''} will be sent to the recipient${certificates.length > 1 ? 's' : ''}</li>
            <li>You'll receive a confirmation email when sent</li>
          </ol>
        </div>

        <p>If you have any questions about your order, please don't hesitate to contact us.</p>
        
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
 * Generates the admin pending certificate email template
 * @param {Object} orderData - The order data
 * @param {Array} certificates - Array of certificates
 * @return {string} HTML email template
 */
function generateAdminPendingCertificateEmailTemplate(orderData, certificates) {
  const certificatesList = certificates.map(cert => `
    <li>
      <strong>${cert.certificate.certificateCode}</strong> - $${cert.certificate.amount.toFixed(2)} 
      (To: ${cert.certificate.recipientName || 'Not specified'})
      ${cert.certificate.recipientEmail ? `<br>Email: ${cert.certificate.recipientEmail}` : ''}
      ${cert.certificate.giftMessage ? `<br><em>Message: "${cert.certificate.giftMessage}"</em>` : ''}
    </li>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c5530;">New Gift Certificate Order (Pending Send)</h2>
      
      <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
        <h3 style="margin-top: 0;">Action Required</h3>
        <p>Gift certificates created but not yet sent to recipients. Please verify payment and send manually from the admin dashboard.</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3>Order Information</h3>
        <p><strong>Order ID:</strong> ${orderData.id}</p>
        <p><strong>Customer:</strong> ${orderData.customer.firstName} ${orderData.customer.lastName}</p>
        <p><strong>Email:</strong> ${orderData.customer.email}</p>
        <p><strong>Phone:</strong> ${orderData.customer.phone}</p>
      </div>
      
      <div style="background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3>Generated Certificates (Pending Send)</h3>
        <ul>
          ${certificatesList}
        </ul>
      </div>
      
      <p><strong>Total Certificates:</strong> ${certificates.length}</p>
      <p><strong>Total Value:</strong> $${certificates.reduce((sum, cert) => sum + cert.certificate.amount, 0).toFixed(2)}</p>
      
      <div style="background-color: #d1ecf1; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #bee5eb;">
        <h4 style="margin-top: 0;">Next Steps:</h4>
        <ol>
          <li>Verify payment has been received</li>
          <li>Go to Admin Dashboard > Gift Certificate Management</li>
          <li>Click "Send" button for each certificate</li>
          <li>Recipients will receive their certificates via email</li>
        </ol>
      </div>
    </div>
  `;
}

module.exports = {
  generateGiftCertificate: exports.generateGiftCertificate
};