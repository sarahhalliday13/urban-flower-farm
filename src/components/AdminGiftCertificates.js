import React, { useState, useEffect } from 'react';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

const AdminGiftCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, partially-redeemed, fully-redeemed, expired, pending, sent
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sendingCertificate, setSendingCertificate] = useState(null);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [certificateToSend, setCertificateToSend] = useState(null);

  useEffect(() => {
    const certificatesRef = ref(database, 'giftCertificates');
    
    // Set up real-time listener
    const unsubscribe = onValue(certificatesRef, (snapshot) => {
      try {
        console.log('🔍 Gift certificates snapshot received:', snapshot.exists());
        if (snapshot.exists()) {
          const certificatesData = snapshot.val();
          console.log('📊 Raw certificates data:', certificatesData);
          const certificatesList = Object.keys(certificatesData).map(key => ({
            ...certificatesData[key],
            id: key
          }));
          
          console.log('📋 Processed certificates list:', certificatesList);
          
          // Sort by creation date (newest first)
          certificatesList.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
          setCertificates(certificatesList);
        } else {
          console.log('❌ No certificates found in database');
          setCertificates([]);
        }
      } catch (error) {
        console.error('Error processing certificates data:', error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error loading certificates:', error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const certificatesRef = ref(database, 'giftCertificates');
      const snapshot = await get(certificatesRef);
      
      if (snapshot.exists()) {
        const certificatesData = snapshot.val();
        const certificatesList = Object.keys(certificatesData).map(key => ({
          ...certificatesData[key],
          id: key
        }));
        
        // Sort by creation date (newest first)
        certificatesList.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
        setCertificates(certificatesList);
      } else {
        setCertificates([]);
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'partially-redeemed': return '#ff9800';
      case 'fully-redeemed': return '#757575';
      case 'expired': return '#f44336';
      default: return '#757575';
    }
  };

  const getStatusLabel = (certificate) => {
    const now = new Date();
    const expirationDate = new Date(certificate.dateExpires);
    
    if (now > expirationDate) {
      return 'Expired';
    }
    return certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1).replace('-', ' ');
  };

  const filteredCertificates = certificates.filter(cert => {
    // Status filter
    const now = new Date();
    const expirationDate = new Date(cert.dateExpires);
    const isExpired = now > expirationDate;
    
    let statusMatch = true;
    if (filter === 'pending') statusMatch = (cert.emailStatus === 'pending' || !cert.emailStatus) && cert.balance > 0 && !isExpired;
    else if (filter === 'sent') statusMatch = cert.emailStatus === 'sent' && cert.balance > 0 && !isExpired;
    else if (filter === 'fully-redeemed') statusMatch = cert.balance === 0;
    else if (filter === 'expired') statusMatch = isExpired;
    
    // Search filter
    const searchMatch = !searchTerm || 
      cert.certificateCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cert.recipientName && cert.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cert.customerEmail && cert.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return statusMatch && searchMatch;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const handleSendCertificate = (certificate) => {
    setCertificateToSend(certificate);
    setShowSendConfirm(true);
  };

  const confirmSendCertificate = async () => {
    if (!certificateToSend) return;

    try {
      setSendingCertificate(certificateToSend.certificateCode);
      setShowSendConfirm(false);

      console.log('🚀 Sending certificate manually:', certificateToSend.certificateCode);

      // Call the Firebase function to send the certificate
      const sendCertificateManually = httpsCallable(functions, 'sendGiftCertificateManually');
      
      const result = await sendCertificateManually({
        certificateCode: certificateToSend.certificateCode,
        adminUserId: 'admin-user' // You could get this from auth context
      });

      console.log('✅ Certificate sent successfully:', result.data);
      
      // Show success message
      const event = new CustomEvent('show-toast', {
        detail: {
          message: `Gift certificate sent successfully to ${certificateToSend.recipientEmail || certificateToSend.customerEmail}`,
          type: 'success',
          duration: 5000
        }
      });
      window.dispatchEvent(event);

    } catch (error) {
      console.error('❌ Error sending certificate:', error);
      
      // Show error message
      const event = new CustomEvent('show-toast', {
        detail: {
          message: `Failed to send certificate: ${error.message}`,
          type: 'error',
          duration: 7000
        }
      });
      window.dispatchEvent(event);
    } finally {
      setSendingCertificate(null);
      setCertificateToSend(null);
    }
  };

  const getEmailStatusColor = (emailStatus) => {
    switch (emailStatus) {
      case 'pending': return '#ffc107'; // Yellow
      case 'sent': return '#28a745'; // Green
      case 'failed': return '#dc3545'; // Red
      default: return '#6c757d'; // Gray
    }
  };

  const getEmailStatusLabel = (emailStatus) => {
    switch (emailStatus) {
      case 'pending': return 'Pending Send';
      case 'sent': return 'Sent';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const getSimplifiedStatus = (cert) => {
    // If balance is 0, it's been fully redeemed
    if (cert.balance === 0) {
      return { label: 'Redeemed', color: '#6c757d' };
    }
    
    // Check email status
    if (cert.emailStatus === 'sent') {
      return { label: 'Sent', color: '#28a745' };
    } else if (cert.emailStatus === 'failed') {
      return { label: 'Failed', color: '#dc3545' };
    } else {
      return { label: 'Pending', color: '#ffc107' };
    }
  };

  const CertificateDetails = ({ certificate, onClose }) => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '30px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#2c5530' }}>Certificate Details</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <strong>Certificate Code:</strong><br />
            <span style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{certificate.certificateCode}</span>
          </div>
          <div>
            <strong>Order ID:</strong><br />
            {certificate.orderId}
          </div>
          <div>
            <strong>Original Amount:</strong><br />
            {formatCurrency(certificate.amount)}
          </div>
          <div>
            <strong>Current Balance:</strong><br />
            <span style={{ 
              color: certificate.balance > 0 ? '#4caf50' : '#f44336',
              fontWeight: 'bold'
            }}>
              {formatCurrency(certificate.balance)}
            </span>
          </div>
          <div>
            <strong>Status:</strong><br />
            <span style={{ 
              color: getStatusColor(certificate.status),
              fontWeight: 'bold'
            }}>
              {getStatusLabel(certificate)}
            </span>
          </div>
          <div>
            <strong>Created:</strong><br />
            {formatDate(certificate.dateCreated)}
          </div>
          <div>
            <strong>Expires:</strong><br />
            {formatDate(certificate.dateExpires)}
          </div>
          <div>
            <strong>Customer Email:</strong><br />
            {certificate.customerEmail}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <strong>Recipient:</strong> {certificate.recipientName || 'Not specified'}<br />
          <strong>From:</strong> {certificate.senderName || 'Not specified'}<br />
          {certificate.recipientEmail && (
            <>
              <strong>Recipient Email:</strong> {certificate.recipientEmail}<br />
            </>
          )}
          {certificate.giftMessage && (
            <>
              <strong>Message:</strong><br />
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '10px',
                borderRadius: '4px',
                fontStyle: 'italic',
                marginTop: '5px'
              }}>
                "{certificate.giftMessage}"
              </div>
            </>
          )}
        </div>

        {certificate.redemptions && certificate.redemptions.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <strong>Redemption History:</strong>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              marginTop: '10px',
              fontSize: '0.9rem'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #dee2e6' }}>Amount</th>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>Order ID</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #dee2e6' }}>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {certificate.redemptions.map((redemption, index) => (
                  <tr key={index}>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                      {formatDate(redemption.date)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #dee2e6' }}>
                      -{formatCurrency(redemption.amount)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                      {redemption.orderId}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {formatCurrency(redemption.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#2c5530',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading gift certificates...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h2 style={{ color: '#2c5530', margin: 0 }}>🎁 Gift Certificate Management</h2>
        <button
          onClick={loadCertificates}
          style={{
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px', 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ marginRight: '8px', fontWeight: 'bold' }}>Status:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="fully-redeemed">Redeemed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search by code, order ID, recipient, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c5530' }}>
            {certificates.length}
          </div>
          <div style={{ color: '#666' }}>Total Certificates</div>
        </div>
        <div style={{
          backgroundColor: '#f0f8ff',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
            {formatCurrency(certificates.reduce((sum, cert) => sum + cert.balance, 0))}
          </div>
          <div style={{ color: '#666' }}>Outstanding Balance</div>
        </div>
        <div style={{
          backgroundColor: '#fff8e1',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f57c00' }}>
            {formatCurrency(certificates.reduce((sum, cert) => sum + cert.amount, 0))}
          </div>
          <div style={{ color: '#666' }}>Total Value Issued</div>
        </div>
      </div>

      {/* Certificates Table */}
      <div style={{ 
        overflowX: 'auto',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderRadius: '8px',
        backgroundColor: 'white'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Code</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Recipient</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Amount</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Balance</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Created</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCertificates.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  {certificates.length === 0 ? 'No gift certificates found' : 'No certificates match the current filters'}
                </td>
              </tr>
            ) : (
              filteredCertificates.map((cert) => (
                <tr key={cert.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {cert.certificateCode}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>{cert.recipientName || 'Not specified'}</div>
                    {cert.recipientEmail && (
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        {cert.recipientEmail}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(cert.amount)}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    textAlign: 'right', 
                    fontWeight: 'bold',
                    color: cert.balance > 0 ? '#4caf50' : '#f44336'
                  }}>
                    {formatCurrency(cert.balance)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      color: getSimplifiedStatus(cert).color,
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}>
                      {getSimplifiedStatus(cert).label}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.9rem' }}>
                    {formatDate(cert.dateCreated)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {(cert.emailStatus === 'pending' || !cert.emailStatus) ? (
                      <button
                        onClick={() => handleSendCertificate(cert)}
                        disabled={sendingCertificate === cert.certificateCode}
                        style={{
                          backgroundColor: sendingCertificate === cert.certificateCode ? '#ccc' : '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '6px 16px',
                          borderRadius: '4px',
                          cursor: sendingCertificate === cert.certificateCode ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}
                      >
                        {sendingCertificate === cert.certificateCode ? 'Sending...' : 'Send'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedCertificate(cert);
                          setShowDetails(true);
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          color: '#2c5530',
                          border: '1px solid #2c5530',
                          padding: '6px 16px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}
                      >
                        Details
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showDetails && selectedCertificate && (
        <CertificateDetails
          certificate={selectedCertificate}
          onClose={() => {
            setShowDetails(false);
            setSelectedCertificate(null);
          }}
        />
      )}

      {/* Send Confirmation Modal */}
      {showSendConfirm && certificateToSend && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 15px 0', color: '#2c5530' }}>Send Gift Certificate</h2>
              <p style={{ margin: '0 0 15px 0' }}>
                Are you sure you want to send this gift certificate?
              </p>
              
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '5px',
                marginBottom: '15px' 
              }}>
                <p><strong>Certificate:</strong> {certificateToSend.certificateCode}</p>
                <p><strong>Amount:</strong> ${certificateToSend.amount.toFixed(2)}</p>
                <p><strong>Recipient:</strong> {certificateToSend.recipientName || 'Not specified'}</p>
                <p><strong>Email:</strong> {certificateToSend.recipientEmail || certificateToSend.customerEmail}</p>
                {certificateToSend.giftMessage && (
                  <p><strong>Message:</strong> "{certificateToSend.giftMessage}"</p>
                )}
              </div>
              
              <div style={{ 
                backgroundColor: '#d1ecf1', 
                padding: '10px', 
                borderRadius: '5px',
                marginBottom: '15px',
                fontSize: '0.9rem'
              }}>
                <strong>Important:</strong> Make sure payment has been verified before sending.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSendConfirm(false);
                  setCertificateToSend(null);
                }}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSendCertificate}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                Send Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGiftCertificates;