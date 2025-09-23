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
      // Use Firebase Functions URL based on environment
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5002/buttonsflowerfarm-8a54d/us-central1/api'
        : 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net/api';
      
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
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      padding: '20px', 
      backgroundColor: '#f9f9f9',
      marginBottom: '20px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Gift Certificates</h3>
      
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
            {error}
          </div>
        )}
      </div>

      {appliedCertificates.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#555' }}>Applied Certificates:</h4>
          {appliedCertificates.map((cert, index) => (
            <div key={cert.code} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#e8f5e9',
              border: '1px solid #c8e6c9',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '8px'
            }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  {cert.code}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Applied: ${cert.appliedAmount.toFixed(2)} | 
                  Available: ${cert.availableBalance.toFixed(2)} |
                  Expires: {formatExpirationDate(cert.expirationDate)}
                </div>
                {cert.recipientName && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    For: {cert.recipientName}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemoveCertificate(cert.code)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Remove
              </button>
            </div>
          ))}
          
          <div style={{
            textAlign: 'right',
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#28a745',
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px'
          }}>
            Total Gift Certificate Credit: ${totalApplied.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftCertificateRedemption;