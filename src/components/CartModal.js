import React from 'react';
import './CartModal.css';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

function CartModal({ isOpen, onClose }) {
  const { cartItems, removeFromCart, updateQuantity, getTotal } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const viewOrders = () => {
    onClose();
    navigate('/orders');
  };

  return (
    <div className="cart-modal-overlay">
      <div className="cart-modal">
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
              {cartItems.map(item => (
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
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="quantity-btn"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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