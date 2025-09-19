import React, { useState } from 'react';
import './GiftCertificate.css';

export function GiftCertificate({ initialAmount = 25, orderNumber = '', purchaserName = '' }) {
  const [amount, setAmount] = useState(initialAmount);
  const [recipient, setRecipient] = useState('');
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState(amount.toString());

  const handleAmountSave = () => {
    const newAmount = parseFloat(tempAmount);
    if (!isNaN(newAmount) && newAmount > 0) {
      setAmount(newAmount);
    } else {
      setTempAmount(amount.toString());
    }
    setIsEditingAmount(false);
  };

  const handleAmountCancel = () => {
    setTempAmount(amount.toString());
    setIsEditingAmount(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAmountSave();
    } else if (e.key === 'Escape') {
      handleAmountCancel();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="gift-certificate-container">
      <div className="gift-certificate-actions">
        <button onClick={handlePrint} className="print-button">
          Print Certificate
        </button>
        {orderNumber && (
          <p className="order-info">Order #{orderNumber}</p>
        )}
      </div>
      
      <div className="gift-certificate-wrapper">
        <div className="gift-certificate">
          {/* Decorative border */}
          <div className="certificate-border-outer">
            <div className="certificate-border-inner">
              
              {/* Header */}
              <div className="certificate-header">
                <img 
                  src="/images/buff-logo-gift-cert.png" 
                  alt="Buttons Flower Farm" 
                  className="certificate-logo"
                />
                <h1 className="certificate-title">GIFT CERTIFICATE</h1>
              </div>

              {/* Amount Section */}
              <div className="certificate-amount-section">
                <p className="amount-label">This certificate is worth</p>
                <div className="amount-container">
                  {isEditingAmount ? (
                    <div className="amount-edit">
                      <span className="dollar-sign">$</span>
                      <input
                        type="text"
                        value={tempAmount}
                        onChange={(e) => setTempAmount(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onBlur={handleAmountSave}
                        className="amount-input"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingAmount(true)}
                      className="amount-display"
                      title="Click to edit amount"
                    >
                      ${amount.toFixed(2)}
                    </button>
                  )}
                </div>
                {!isEditingAmount && (
                  <p className="edit-hint">Click amount to edit</p>
                )}
              </div>

              {/* Recipient Section */}
              <div className="certificate-recipient">
                <div className="recipient-field">
                  <label className="field-label">TO:</label>
                  <input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Recipient name"
                    className="recipient-input"
                  />
                </div>
                {purchaserName && (
                  <div className="from-field">
                    <label className="field-label">FROM:</label>
                    <span className="from-name">{purchaserName}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="certificate-footer">
                <div className="footer-grid">
                  <div className="signature-field">
                    <p className="field-label">AUTHORIZED SIGNATURE</p>
                  </div>
                  <div className="date-field">
                    <p className="field-label">DATE</p>
                    <p className="date-value">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="certificate-terms">
                  <p>This certificate is valid for merchandise or services at Buttons Flower Farm.</p>
                  <p>Not redeemable for cash. No expiration date.</p>
                  {orderNumber && (
                    <p className="certificate-code">Certificate Code: {orderNumber}</p>
                  )}
                </div>
              </div>

              {/* Decorative corners */}
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}