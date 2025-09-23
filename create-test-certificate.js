const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
if (!admin.apps.length) {
  try {
    // Try to use the default service account from the environment
    admin.initializeApp({
      databaseURL: 'https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com'
    });
  } catch (error) {
    console.log('Using default credentials...');
    admin.initializeApp();
  }
}

const { createCertificate } = require('./functions/certificateService');

async function createTestCertificate() {
  try {
    console.log('Creating test gift certificate...');
    
    const testCertificateData = {
      orderId: 'TEST-2025-001',
      amount: 50,
      recipientName: 'Test Recipient',
      recipientEmail: 'test@example.com',
      senderName: 'Test Sender',
      giftMessage: 'Test gift certificate for development',
      customerEmail: 'customer@example.com'
    };

    const certificate = await createCertificate(testCertificateData);
    console.log('✅ Test certificate created successfully:');
    console.log('Certificate Code:', certificate.certificateCode);
    console.log('Amount:', `$${certificate.amount}`);
    console.log('Balance:', `$${certificate.balance}`);
    console.log('Status:', certificate.status);
    console.log('Email Status:', certificate.emailStatus);
    
    // Update email status to 'sent' and payment verified for testing
    const certificateRef = admin.database().ref(`giftCertificates/${certificate.certificateCode}`);
    await certificateRef.update({
      emailStatus: 'sent',
      paymentVerified: true,
      emailSentDate: new Date().toISOString(),
      emailSentBy: 'test-admin'
    });
    
    console.log('✅ Certificate updated for testing (marked as sent and paid)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test certificate:', error);
    process.exit(1);
  }
}

createTestCertificate();