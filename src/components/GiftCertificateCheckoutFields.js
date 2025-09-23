import React from 'react';

const GiftCertificateCheckoutFields = ({ 
  giftCertificateItems, 
  giftCertificateData, 
  onGiftCertificateChange,
  customerName 
}) => {
  if (!giftCertificateItems || giftCertificateItems.length === 0) {
    return null;
  }

  return (
    <div className="gift-certificate-section">
      <h3 style={{ 
        color: '#059669', 
        marginBottom: '1rem', 
        fontSize: '1.2rem',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '0.5rem'
      }}>
        🎁 Gift Certificate Details
      </h3>
      <p style={{ 
        color: '#6b7280', 
        marginBottom: '1.5rem', 
        fontSize: '0.9rem' 
      }}>
        Please provide details for your gift certificate{giftCertificateItems.length > 1 ? 's' : ''}. 
        You can personalize each certificate with recipient information and a custom message.
      </p>

      {giftCertificateItems.map((item, index) => {
        const certData = giftCertificateData[item.id] || {};
        const isMultiple = parseInt(item.quantity) > 1;

        return (
          <div 
            key={item.id}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              backgroundColor: '#f9fafb'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <h4 style={{ 
                color: '#1f2937', 
                margin: 0,
                fontSize: '1.1rem' 
              }}>
                Gift Certificate ${parseFloat(item.price).toFixed(2)}
              </h4>
              {isMultiple && (
                <span style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  Quantity: {item.quantity}
                </span>
              )}
            </div>

            {isMultiple && (
              <div style={{
                backgroundColor: '#e0f2f1',
                border: '1px solid #4caf50',
                borderRadius: '4px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: '#2e7d32'
              }}>
                <strong>Multiple Certificates:</strong> The information below will be applied to all {item.quantity} certificates of this amount. 
                Each certificate will receive a unique code.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Recipient Name */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Recipient Name {!certData.recipientName && <span style={{ color: '#6b7280' }}>(optional)</span>}
                </label>
                <input
                  type="text"
                  value={certData.recipientName || ''}
                  onChange={(e) => onGiftCertificateChange(item.id, 'recipientName', e.target.value)}
                  placeholder="Who is this gift for?"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Sender Name */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  From {!certData.senderName && <span style={{ color: '#6b7280' }}>(optional)</span>}
                </label>
                <input
                  type="text"
                  value={certData.senderName || customerName}
                  onChange={(e) => onGiftCertificateChange(item.id, 'senderName', e.target.value)}
                  placeholder={customerName || "Your name"}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Recipient Email */}
            <div style={{ marginTop: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                Recipient Email <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(optional - for direct delivery)</span>
              </label>
              <input
                type="email"
                value={certData.recipientEmail || ''}
                onChange={(e) => onGiftCertificateChange(item.id, 'recipientEmail', e.target.value)}
                placeholder="Email to send certificate directly to recipient"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              {certData.recipientEmail && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#e0f2f1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#2e7d32'
                }}>
                  Certificate will be sent directly to recipient at this email
                </div>
              )}
            </div>

            {/* Gift Message */}
            <div style={{ marginTop: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                Personal Message <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(optional)</span>
              </label>
              <textarea
                value={certData.giftMessage || ''}
                onChange={(e) => onGiftCertificateChange(item.id, 'giftMessage', e.target.value)}
                placeholder="Add a personal message to make this gift extra special..."
                rows="3"
                maxLength="200"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{
                textAlign: 'right',
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem'
              }}>
                {(certData.giftMessage || '').length}/200 characters
              </div>
            </div>
          </div>
        );
      })}

      <div style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        padding: '1rem',
        marginTop: '1rem',
        fontSize: '0.9rem',
        color: '#856404'
      }}>
        <strong>How it works:</strong>
        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem' }}>
          <li>Gift certificates are delivered as professional PDF attachments once payment is received</li>
          <li>Each certificate includes a unique code for redemption</li>
          <li>Certificates are valid for 1 year from purchase date</li>
          <li>If recipient email is provided, we'll send directly to them</li>
          <li>You'll receive an email confirmation once the certificate is sent</li>
        </ul>
      </div>
    </div>
  );
};

export default GiftCertificateCheckoutFields;