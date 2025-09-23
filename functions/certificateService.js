const admin = require("firebase-admin");
const { generateCertificateCode } = require('./generateCertificatePDF');

/**
 * Certificate service for managing gift certificates in Firebase
 */

/**
 * Creates a new gift certificate record in the database
 * @param {Object} certificateData - The certificate data
 * @return {Promise<Object>} The created certificate with ID
 */
async function createCertificate(certificateData) {
  try {
    const {
      orderId,
      amount,
      recipientName,
      recipientEmail,
      senderName,
      giftMessage,
      customerEmail
    } = certificateData;

    // Generate unique certificate code
    const certificateCode = generateCertificateCode(orderId);
    const now = new Date().toISOString();
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1); // 1 year expiration

    const certificate = {
      certificateCode,
      orderId,
      amount: parseFloat(amount),
      recipientName: recipientName || '',
      recipientEmail: recipientEmail || '',
      senderName: senderName || '',
      giftMessage: giftMessage || '',
      customerEmail: customerEmail || '',
      dateCreated: now,
      dateExpires: expirationDate.toISOString(),
      balance: parseFloat(amount),
      redemptions: [],
      status: 'active', // active, partially-redeemed, fully-redeemed, expired
      emailStatus: 'pending', // pending, sent, failed
      emailSentDate: null,
      emailSentBy: null,
      paymentVerified: false,
      createdBy: 'system',
      lastModified: now
    };

    // Save to Firebase
    const certificateRef = admin.database().ref(`giftCertificates/${certificateCode}`);
    await certificateRef.set(certificate);

    console.log('✅ Certificate created successfully:', certificateCode);
    return certificate;

  } catch (error) {
    console.error('❌ Error creating certificate:', error);
    throw error;
  }
}

/**
 * Gets a certificate by its code
 * @param {string} certificateCode - The certificate code
 * @return {Promise<Object|null>} The certificate data or null if not found
 */
async function getCertificate(certificateCode) {
  try {
    const certificateRef = admin.database().ref(`giftCertificates/${certificateCode}`);
    const snapshot = await certificateRef.once('value');
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;

  } catch (error) {
    console.error('❌ Error getting certificate:', error);
    throw error;
  }
}

/**
 * Gets all certificates for an order
 * @param {string} orderId - The order ID
 * @return {Promise<Array>} Array of certificates
 */
async function getCertificatesByOrder(orderId) {
  try {
    const certificatesRef = admin.database().ref('giftCertificates');
    const snapshot = await certificatesRef.orderByChild('orderId').equalTo(orderId).once('value');
    
    const certificates = [];
    snapshot.forEach((childSnapshot) => {
      certificates.push(childSnapshot.val());
    });
    
    return certificates;

  } catch (error) {
    console.error('❌ Error getting certificates by order:', error);
    throw error;
  }
}

/**
 * Validates a certificate for redemption
 * @param {string} certificateCode - The certificate code
 * @param {number} amount - The amount to redeem
 * @return {Promise<Object>} Validation result
 */
async function validateCertificate(certificateCode, amount = 0) {
  try {
    const certificate = await getCertificate(certificateCode);
    
    if (!certificate) {
      return {
        valid: false,
        error: 'Certificate not found',
        certificate: null
      };
    }

    // Check if expired
    const now = new Date();
    const expirationDate = new Date(certificate.dateExpires);
    if (now > expirationDate) {
      return {
        valid: false,
        error: 'Certificate has expired',
        certificate
      };
    }

    // Check status
    if (certificate.status === 'fully-redeemed') {
      return {
        valid: false,
        error: 'Certificate has been fully redeemed',
        certificate
      };
    }

    // Check balance
    if (amount > certificate.balance) {
      return {
        valid: false,
        error: `Insufficient balance. Available: $${certificate.balance.toFixed(2)}`,
        certificate
      };
    }

    return {
      valid: true,
      certificate,
      availableBalance: certificate.balance
    };

  } catch (error) {
    console.error('❌ Error validating certificate:', error);
    throw error;
  }
}

/**
 * Redeems a certificate (full or partial)
 * @param {string} certificateCode - The certificate code
 * @param {number} amount - The amount to redeem
 * @param {string} orderId - The order ID for this redemption
 * @return {Promise<Object>} Redemption result
 */
async function redeemCertificate(certificateCode, amount, orderId) {
  try {
    // First validate the certificate
    const validation = await validateCertificate(certificateCode, amount);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        certificate: validation.certificate
      };
    }

    const certificate = validation.certificate;
    const newBalance = certificate.balance - amount;
    const now = new Date().toISOString();

    // Create redemption record
    const redemption = {
      date: now,
      amount: amount,
      orderId: orderId,
      balanceAfter: newBalance
    };

    // Update certificate
    const updatedCertificate = {
      ...certificate,
      balance: newBalance,
      status: newBalance === 0 ? 'fully-redeemed' : 'partially-redeemed',
      redemptions: [...certificate.redemptions, redemption],
      lastModified: now
    };

    // Save to Firebase
    const certificateRef = admin.database().ref(`giftCertificates/${certificateCode}`);
    await certificateRef.set(updatedCertificate);

    console.log(`✅ Certificate ${certificateCode} redeemed: $${amount}, new balance: $${newBalance}`);
    
    return {
      success: true,
      certificate: updatedCertificate,
      redeemedAmount: amount,
      remainingBalance: newBalance
    };

  } catch (error) {
    console.error('❌ Error redeeming certificate:', error);
    throw error;
  }
}

/**
 * Gets all certificates (admin function)
 * @param {Object} filters - Optional filters
 * @return {Promise<Array>} Array of certificates
 */
async function getAllCertificates(filters = {}) {
  try {
    const certificatesRef = admin.database().ref('giftCertificates');
    const snapshot = await certificatesRef.once('value');
    
    let certificates = [];
    snapshot.forEach((childSnapshot) => {
      certificates.push(childSnapshot.val());
    });

    // Apply filters if provided
    if (filters.status) {
      certificates = certificates.filter(cert => cert.status === filters.status);
    }
    if (filters.orderId) {
      certificates = certificates.filter(cert => cert.orderId === filters.orderId);
    }
    if (filters.customerEmail) {
      certificates = certificates.filter(cert => cert.customerEmail === filters.customerEmail);
    }

    // Sort by creation date (newest first)
    certificates.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    
    return certificates;

  } catch (error) {
    console.error('❌ Error getting all certificates:', error);
    throw error;
  }
}

/**
 * Updates a certificate's balance (admin function)
 * @param {string} certificateCode - The certificate code
 * @param {number} newBalance - The new balance
 * @param {string} reason - Reason for the change
 * @return {Promise<Object>} Updated certificate
 */
async function updateCertificateBalance(certificateCode, newBalance, reason = 'Manual adjustment') {
  try {
    const certificate = await getCertificate(certificateCode);
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    const now = new Date().toISOString();
    const adjustment = {
      date: now,
      previousBalance: certificate.balance,
      newBalance: newBalance,
      adjustment: newBalance - certificate.balance,
      reason: reason
    };

    const updatedCertificate = {
      ...certificate,
      balance: newBalance,
      status: newBalance === 0 ? 'fully-redeemed' : 
              newBalance < certificate.amount ? 'partially-redeemed' : 'active',
      adjustments: [...(certificate.adjustments || []), adjustment],
      lastModified: now
    };

    const certificateRef = admin.database().ref(`giftCertificates/${certificateCode}`);
    await certificateRef.set(updatedCertificate);

    console.log(`✅ Certificate ${certificateCode} balance updated to $${newBalance}`);
    return updatedCertificate;

  } catch (error) {
    console.error('❌ Error updating certificate balance:', error);
    throw error;
  }
}

module.exports = {
  createCertificate,
  getCertificate,
  getCertificatesByOrder,
  validateCertificate,
  redeemCertificate,
  getAllCertificates,
  updateCertificateBalance
};