import React, { useState } from 'react';

const GiftCertificateRedemption = ({ 
  onCertificateApplied, 
  onCertificateRemoved, 
  appliedCertificates = [],
  orderTotal = 0 
}) => {
  const [certificateCode, setCertificateCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const validateCertificate = async (code, amount = 0) => {
    try {
      // Use Firebase Functions URL - temporarily use deployed functions for local testing
      const baseUrl = 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net/api';
      
      const response = await fetch(`${baseUrl}/validateCertificate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificateCode: code,
          amount: amount
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating certificate:', error);
      throw new Error('Failed to validate certificate');
    }
  };

  const handleApplyCertificate = async () => {
    if (!certificateCode.trim()) {
      setError('Please enter a certificate code');
      return;
    }

    // Check if certificate is already applied
    if (appliedCertificates.some(cert => cert.code === certificateCode.trim())) {
      setError('This certificate is already applied');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const validation = await validateCertificate(certificateCode.trim());
      
      if (!validation.success || !validation.valid) {
        setError(validation.error || 'Certificate is not valid');
        setValidating(false);
        return;
      }

      const certificate = validation.certificate;
      const availableBalance = validation.availableBalance;
      
      // Calculate how much we can use from this certificate
      const remainingOrderTotal = orderTotal - appliedCertificates.reduce((sum, cert) => sum + cert.appliedAmount, 0);
      const appliedAmount = Math.min(availableBalance, remainingOrderTotal);

      if (appliedAmount <= 0) {
        setError('Order total is already covered by applied certificates');
        setValidating(false);
        return;
      }

      const appliedCertificate = {
        code: certificateCode.trim(),
        appliedAmount: appliedAmount,
        availableBalance: availableBalance,
        recipientName: certificate.recipientName,
        expirationDate: certificate.dateExpires
      };

      onCertificateApplied(appliedCertificate);
      setCertificateCode('');
      setValidating(false);
      
    } catch (error) {
      setError(error.message || 'Failed to validate certificate');
      setValidating(false);
    }
  };

  const handleRemoveCertificate = (code) => {
    onCertificateRemoved(code);
  };

  const formatExpirationDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const totalApplied = appliedCertificates.reduce((sum, cert) => sum + cert.appliedAmount, 0);

  return (
    <div style={{ 
      marginBottom: '20px'
    }}>
      
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Enter gift certificate code"
            value={certificateCode}
            onChange={(e) => setCertificateCode(e.target.value.toUpperCase())}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            disabled={validating}
          />
          <button
            onClick={handleApplyCertificate}
            disabled={validating || !certificateCode.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: validating ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: validating ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {validating ? 'Validating...' : 'Apply'}
          </button>
        </div>
        
        {error && (
          <div style={{ 
            color: '#dc3545', 
            fontSize: '14px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '8px 12px'
          }}>
            {error.includes('contact us to help') ? (
              <>
                Certificate not found, <a href="mailto:buttonsflowerfarm@telus.net" style={{ color: '#dc3545', textDecoration: 'underline' }}>contact us</a> to help
              </>
            ) : (
              error
            )}
          </div>
        )}
      </div>

      {appliedCertificates.length > 0 && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {appliedCertificates.map((cert, index) => (
              <div key={cert.code} style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '20px',
                padding: '6px 10px 6px 14px',
                fontSize: '14px',
                gap: '8px'
              }}>
                <span style={{ color: '#333' }}>{cert.code}</span>
                <span style={{ color: '#28a745', fontWeight: '500' }}>-${cert.appliedAmount.toFixed(2)}</span>
                <button
                  onClick={() => handleRemoveCertificate(cert.code)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    fontSize: '18px',
                    lineHeight: '1',
                    cursor: 'pointer',
                    padding: '0 2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#666'}
                  onMouseOut={(e) => e.target.style.color = '#999'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
        </div>
      )}
    </div>
  );
};

export default GiftCertificateRedemption;