import React, { useRef, useEffect, useState } from 'react';
import './CartModal.css';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

function CartModal({ isOpen, onClose }) {
  const { cartItems, removeFromCart, updateQuantity, getTotal } = useCart();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const [animationState, setAnimationState] = useState('exited');
  
  // Handle animation states
  useEffect(() => {
    let timeoutId;
    
    if (isOpen) {
      setAnimationState('entering');
      timeoutId = setTimeout(() => {
        setAnimationState('entered');
      }, 10); // Small delay to trigger CSS transition
    } else {
      if (animationState === 'entered' || animationState === 'entering') {
        setAnimationState('exiting');
        timeoutId = setTimeout(() => {
          setAnimationState('exited');
        }, 300); // Match CSS transition duration
      }
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, animationState]);
  
  // Handle click outside to close modal
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }
    
    // Add event listener when modal is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Don't render anything if fully exited
  if (animationState === 'exited' && !isOpen) return null;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const viewOrders = () => {
    onClose();
    navigate('/orders');
  };

  return (
    <div className={`cart-modal-overlay ${animationState}`}>
      <div className="cart-modal" ref={modalRef}>
        <button className="cart-close" onClick={onClose}>×</button>
        <h2>Shopping Cart</h2>
        
        {cartItems.length === 0 ? (
          <div className="empty-cart-container">
            <p className="empty-cart">Your cart is empty</p>
            <button className="view-orders-btn" onClick={viewOrders}>View My Orders</button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map(item => {
                // Check if we can add more of this item
                const availableStock = parseInt(item.inventory?.currentStock, 10) || 0;
                const currentQuantity = parseInt(item.quantity, 10) || 0;
                const canIncreaseQuantity = currentQuantity < availableStock;
                
                return (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-image">
                      {item.mainImage ? (
                        <img 
                          src={item.mainImage} 
                          alt={item.name}
                          onError={(e) => {
                            console.error('Cart image failed to load:', item.mainImage);
                            e.target.src = '/images/placeholder.jpg';
                          }}
                        />
                      ) : (
                        <div className="emoji-image">🌱</div>
                      )}
                    </div>
                    <div className="cart-item-content">
                      <div className="cart-item-top-row">
                        <div className="cart-item-name">
                          <h3>{item.name}</h3>
                        </div>
                        <div className="cart-item-price">
                          ${item.price}
                        </div>
                      </div>
                      <div className="cart-item-bottom-row">
                        <button 
                          className="remove-item"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </button>
                        <div className="cart-item-quantity">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="quantity-btn"
                            disabled={currentQuantity <= 1}
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="quantity-btn"
                            disabled={!canIncreaseQuantity}
                            title={!canIncreaseQuantity ? "Maximum stock reached" : ""}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {!canIncreaseQuantity && (
                        <div className="stock-limit-message">
                          Max stock reached
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="cart-summary">
              <div className="cart-total">
                <span>Total:</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
              <button className="checkout-btn" onClick={handleCheckout}>Proceed to Checkout</button>
              <button className="view-orders-btn" onClick={viewOrders}>View My Orders</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CartModal; 