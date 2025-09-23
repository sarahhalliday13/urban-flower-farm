import React, { useState } from 'react';

const GiftCertificateGenerator = () => {
  const [amount, setAmount] = useState(25);
  const [recipient, setRecipient] = useState('');
  const [sender, setSender] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
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

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      background: '#f9fafb', 
      padding: '1rem' 
    }}>
      <div 
        style={{ 
          width: '800px', 
          height: '800px',
          background: 'white',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative border */}
        <div style={{
          position: 'absolute',
          inset: '1rem',
          border: '4px double #d1d5db'
        }}>
          <div style={{
            position: 'absolute',
            inset: '1rem',
            border: '1px solid #e5e7eb'
          }}>
            
            {/* Header */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: '2rem',
              paddingBottom: '1rem'
            }}>
              <img 
                src="/images/figma-logo.png"
                alt="Logo" 
                style={{
                  height: '108px',
                  width: 'auto',
                  marginBottom: '1.5rem'
                }}
                onError={(e) => {
                  // Fallback to existing logo
                  e.target.src = "/images/buff-logo-gift-cert.png";
                }}
              />
              <h1 style={{
                fontSize: '2.25rem',
                color: '#1f2937',
                letterSpacing: '0.1em'
              }}>GIFT CERTIFICATE</h1>
            </div>

            {/* Amount Section */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <p style={{
                fontSize: '1.125rem',
                color: '#6b7280',
                marginBottom: '1rem'
              }}>This certificate is worth</p>
              <div style={{ position: 'relative' }}>
                {isEditingAmount ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '3.75rem',
                      color: '#059669'
                    }}>$</span>
                    <input
                      value={tempAmount}
                      onChange={(e) => setTempAmount(e.target.value)}
                      onKeyDown={handleKeyPress}
                      onBlur={handleAmountSave}
                      style={{
                        width: '8rem',
                        fontSize: '3.75rem',
                        color: '#059669',
                        textAlign: 'center',
                        border: '2px solid #6ee7b7',
                        borderRadius: '0.25rem',
                        padding: '0',
                        outline: 'none',
                        background: 'transparent'
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingAmount(true)}
                    style={{
                      fontSize: '3.75rem',
                      color: '#059669',
                      background: 'transparent',
                      border: 'none',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '0.25rem',
                      transition: 'color 0.3s'
                    }}
                    onMouseOver={(e) => e.target.style.color = '#047857'}
                    onMouseOut={(e) => e.target.style.color = '#059669'}
                  >
                    ${amount.toFixed(2)}
                  </button>
                )}
              </div>
              {!isEditingAmount && (
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  marginTop: '0.5rem'
                }}>Click amount to edit</p>
              )}
            </div>

            {/* Recipient Section */}
            <div style={{
              padding: '0 4rem',
              marginBottom: '3rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem'
              }}>
                <div style={{
                  borderBottom: '2px solid #d1d5db',
                  paddingBottom: '0.5rem'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                    textAlign: 'left'
                  }}>TO:</label>
                  <input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Recipient name"
                    style={{
                      fontSize: '1.25rem',
                      color: '#1f2937',
                      border: 'none',
                      background: 'transparent',
                      padding: '0',
                      width: '100%',
                      outline: 'none',
                      textAlign: 'left'
                    }}
                  />
                </div>
                <div style={{
                  borderBottom: '2px solid #d1d5db',
                  paddingBottom: '0.5rem'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                    textAlign: 'left'
                  }}>FROM:</label>
                  <input
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="Your name"
                    style={{
                      fontSize: '1.25rem',
                      color: '#1f2937',
                      border: 'none',
                      background: 'transparent',
                      padding: '0',
                      width: '100%',
                      outline: 'none',
                      textAlign: 'left'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              position: 'absolute',
              bottom: '5rem',
              left: '4rem',
              right: '4rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '3rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  borderBottom: '1px solid #d1d5db',
                  paddingBottom: '0.5rem',
                  minHeight: '2rem'
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem'
                  }}>AUTHORIZED SIGNATURE</p>
                </div>
                <div style={{
                  borderBottom: '1px solid #d1d5db',
                  paddingBottom: '0.5rem'
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem'
                  }}>DATE</p>
                  <p style={{
                    color: '#1f2937',
                    fontSize: '1rem'
                  }}>{new Date().toLocaleDateString()}</p>
                </div>
              </div>
              
              <div style={{
                marginTop: '2rem',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginBottom: '0.5rem'
                }}>
                  This certificate is valid for merchandise or services. Not redeemable for cash.
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <label style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>Order #:</label>
                    <input
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="Optional"
                      style={{
                        fontSize: '0.75rem',
                        color: '#1f2937',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        width: '120px',
                        outline: 'none',
                        background: 'white'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative corners */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              width: '2rem',
              height: '2rem',
              borderLeft: '2px solid #d1d5db',
              borderTop: '2px solid #d1d5db'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '2rem',
              height: '2rem',
              borderRight: '2px solid #d1d5db',
              borderTop: '2px solid #d1d5db'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              width: '2rem',
              height: '2rem',
              borderLeft: '2px solid #d1d5db',
              borderBottom: '2px solid #d1d5db'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              right: '1rem',
              width: '2rem',
              height: '2rem',
              borderRight: '2px solid #d1d5db',
              borderBottom: '2px solid #d1d5db'
            }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftCertificateGenerator;