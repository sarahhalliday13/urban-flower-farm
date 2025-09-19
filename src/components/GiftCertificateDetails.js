import React from 'react';
import './PlantDetails.css';
import './GiftCertificate.css';

const GiftCertificateDetails = ({ plant, quantity, onQuantityChange, onAddToCart, onBackToShop }) => {
  const imageUrl = plant.mainImage || '/images/gift-certificate-full.png';
  
  // Other gift certificate amounts for suggestions
  const otherAmounts = [
    { id: 'gc-25', name: 'Gift Certificate $25', price: 25 },
    { id: 'gc-50', name: 'Gift Certificate $50', price: 50 },
    { id: 'gc-75', name: 'Gift Certificate $75', price: 75 },
    { id: 'gc-100', name: 'Gift Certificate $100', price: 100 },
    { id: 'gc-150', name: 'Gift Certificate $150', price: 150 },
    { id: 'gc-200', name: 'Gift Certificate $200', price: 200 },
  ].filter(gc => gc.price !== plant.price); // Exclude current amount

  const NavigationButtons = ({ className }) => (
    <div className={`plant-navigation ${className}`}>
      <div className="navigation-container" style={{ padding: 0, margin: 0 }}>
        <a 
          href="/shop"
          onClick={(e) => {
            e.preventDefault();
            onBackToShop();
          }}
          className="back-to-shop-button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 16px',
            backgroundColor: '#f1f7f1',
            color: '#2c5530',
            textDecoration: 'none',
            borderRadius: '4px',
            border: '1px solid #a8c5a9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            fontWeight: '500',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2c5530';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f7f1';
            e.currentTarget.style.color = '#2c5530';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}
        >
          Back to Shop
        </a>
        <div className="nav-group">
          <button
            className="nav-button"
            disabled={true}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#f5f5f5',
              color: '#999',
              cursor: 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              textDecoration: 'none',
              minWidth: '12px',
              height: '36px',
              boxSizing: 'border-box',
              marginRight: '8px'
            }}
          >
            ← Previous
          </button>
          <button
            className="nav-button"
            disabled={true}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#f5f5f5',
              color: '#999',
              cursor: 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              textDecoration: 'none',
              minWidth: '12px',
              height: '36px',
              boxSizing: 'border-box'
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="shop-main">
      {/* Navigation - matching PlantDetails */}
      <NavigationButtons className="top" />
      
      {/* Main Content Container - matching PlantDetails structure */}
      <div className="plant-details-container gift-certificate-layout">
        {/* Image Section - matching PlantDetails image handling */}
        <div className="gift-certificate-image-section">
          <img 
            src={imageUrl}
            alt={plant.name}
            style={{
              width: '400px',
              height: '400px',
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              padding: '30px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onError={(e) => {
              e.target.src = '/images/placeholder.jpg';
            }}
          />
        </div>
        
        {/* Details Section - exactly matching PlantDetails structure */}
        <div className="gift-certificate-content-section">
          <div className="plant-info" style={{ padding: 0, margin: 0, paddingLeft: 0, paddingRight: 0 }}>
            <div className="name-and-status">
              <h1 className="plant-common-name">{plant.name}</h1>
              <span className="status-badge in-stock" style={{
                backgroundColor: '#f4e8d7',
                color: '#7a5c2c',
                border: '1px solid #e8d4b0'
              }}>
                Gift Certificate
              </span>
            </div>
          </div>
          
          <p className="description">{plant.description}</p>
          
          <div className="price-action-container">
            <p className="price" style={{ 
              color: '#2c5530',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              margin: 0
            }}>${plant.price}</p>
            <div className="price-controls">
              <div className="quantity-selector">
                <button 
                  className="quantity-button"
                  onClick={() => onQuantityChange(-1)}
                  disabled={quantity <= 1}
                >-</button>
                <span className="quantity">{quantity}</span>
                <button 
                  className="quantity-button"
                  onClick={() => onQuantityChange(1)}
                >+</button>
              </div>
              <button 
                className="plant-buy"
                onClick={onAddToCart}
              >
                Buy
              </button>
            </div>
          </div>
          
          {/* Gift Certificate Details - matching plant-specs structure */}
          <div className="gift-certificate-details">
            <h3>Gift Certificate Details</h3>
            <p><strong>Type:</strong> Digital Delivery</p>
            <p><strong>Value:</strong> ${plant.price}</p>
            <p><strong>Delivery:</strong> Emailed within 24 hours</p>
            <p><strong>Valid:</strong> No expiration</p>
            <div className="redemption-instructions">
              <h4>How to Redeem:</h4>
              <p>This digital gift certificate will be emailed to the recipient with a unique code. They can enter this code at checkout to apply the credit to their order. The certificate can be used for any plants or products in our shop and never expires.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* You might also like section */}
      <div className="suggestions-section" style={{
        marginTop: '4rem',
        padding: '2rem',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#f9f9f9'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          color: '#2c5530',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>You might also like</h2>
        
        <div className="gift-certificate-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1.5rem',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          {otherAmounts.map(gc => (
            <div key={gc.id} className="gc-suggestion-card" style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onClick={() => {
              // Navigate to the gift certificate with this amount
              window.location.href = `/plant/${gc.id}`;
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1rem',
                backgroundColor: '#f4e8d7',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src="/images/gift-certificate.png"
                  alt={gc.name}
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<span style="font-size: 24px; color: #7a5c2c;">🎁</span>`;
                  }}
                />
              </div>
              <h3 style={{
                fontSize: '1.25rem',
                color: '#2c5530',
                margin: '0.5rem 0',
                fontWeight: '600'
              }}>${gc.price}</h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#666',
                margin: '0'
              }}>Gift Certificate</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom navigation */}
      <NavigationButtons className="bottom" />
    </div>
  );
};

export default GiftCertificateDetails;