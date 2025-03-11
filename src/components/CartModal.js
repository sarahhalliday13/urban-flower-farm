import React from 'react';
import './CartModal.css';
import { useCart } from '../context/CartContext';

function CartModal({ isOpen, onClose }) {
  const { cartItems, removeFromCart, updateQuantity, getTotal } = useCart();

  if (!isOpen) return null;

  return (
    <div className="cart-modal-overlay">
      <div className="cart-modal">
        <button className="cart-close" onClick={onClose}>×</button>
        <h2>Shopping Cart</h2>
        
        {cartItems.length === 0 ? (
          <p className="empty-cart">Your cart is empty</p>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    {typeof item.image === 'string' && item.image.startsWith('🌱') ? (
                      <div className="emoji-image">{item.image}</div>
                    ) : (
                      <img src={item.image} alt={item.name} />
                    )}
                  </div>
                  <div className="cart-item-details">
                    <h3>{item.name}</h3>
                    <p className="cart-item-price">${item.price}</p>
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
                  <button 
                    className="remove-item"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            <div className="cart-summary">
              <div className="cart-total">
                <span>Total:</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
              <button className="checkout-btn">Proceed to Checkout</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CartModal; 