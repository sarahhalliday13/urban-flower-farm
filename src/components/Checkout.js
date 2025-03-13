import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { updateInventory } from '../services/firebase';
import '../styles/Checkout.css';

const Checkout = () => {
  const { cartItems, getTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [orderComplete, setOrderComplete] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [orderId, setOrderId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [inventoryUpdateStatus, setInventoryUpdateStatus] = useState(null);

  useEffect(() => {
    // Redirect to shop if cart is empty
    if (cartItems.length === 0 && !orderComplete) {
      navigate('/shop');
    }
  }, [cartItems, navigate, orderComplete]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    // Email validation (required)
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Phone validation (required)
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[^0-9]/g, ''))) {
      newErrors.phone = 'Phone number must be valid (10 digits)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Show processing
    setIsSubmitting(true);
    
    try {
      // Format the order data
      const orderData = {
        id: `ORD-${Date.now()}`,
        date: new Date().toISOString(),
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zip: formData.zip
          }
        },
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total: getTotal().toFixed(2),
        payment: {
          method: 'Credit Card',
          cardNumber: `**** **** **** ${formData.cardNumber.slice(-4)}`,
          nameOnCard: formData.nameOnCard,
          expiry: formData.expiry
        },
        status: 'Processing'
      };
      
      // Save the order to localStorage
      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      localStorage.setItem('orders', JSON.stringify([...existingOrders, orderData]));
      localStorage.setItem('userEmail', formData.email.toLowerCase());
      
      // Update inventory using Firebase
      for (const item of cartItems) {
        await updateInventory(item.id, {
          currentStock: Math.max(0, (item.inventory?.currentStock || 0) - item.quantity),
          lastUpdated: new Date().toISOString()
        });
      }
      
      // Clear cart and navigate to confirmation
      clearCart();
      setIsSubmitting(false);
      navigate('/checkout/confirmation', { state: { order: orderData } });
    } catch (error) {
      console.error('Error processing order:', error);
      setIsSubmitting(false);
      setErrors({
        ...errors,
        submit: 'There was an error processing your order. Please try again.'
      });
    }
  };

  if (orderComplete) {
    return (
      <div className="checkout-container">
        <div className="order-confirmation">
          <h2>Thank You for Your Order!</h2>
          <p className="order-id">Order ID: <span>{orderId}</span></p>
          <p>We've received your order and will be in touch soon.</p>
          <p>A confirmation has been sent to <strong>{formData.email}</strong>.</p>
          
          {inventoryUpdateStatus === 'warning' && (
            <p className="inventory-warning">
              Note: There may have been issues updating our inventory system. 
              Our team will review your order manually.
            </p>
          )}
          
          <div className="payment-instructions">
            <h3>Payment Instructions</h3>
            <p>Please complete your payment using one of the following methods:</p>
            <ul>
              <li><strong>Cash:</strong> Available for in-person pickup</li>
              <li><strong>E-Transfer:</strong> Send to colleenhutton@gmail.com</li>
            </ul>
            <p>Please include your order number ({orderId}) in the payment notes.</p>
          </div>
          
          <div className="pickup-confirmation">
            <h3>Pickup Information</h3>
            <p>We will confirm your pickup date and time by text message to <strong>{formData.phone}</strong>.</p>
            {formData.notes && (
              <div className="requested-pickup">
                <p><strong>Your requested pickup:</strong></p>
                <p>{formData.notes}</p>
              </div>
            )}
          </div>
          
          <div className="order-actions">
            <button 
              onClick={() => navigate('/orders')} 
              className="view-orders-btn"
            >
              View Your Orders
            </button>
            <button 
              onClick={() => navigate('/shop')} 
              className="continue-shopping-btn"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>
      
      <div className="checkout-content">
        <div className="checkout-form-container">
          <h2>Contact Information</h2>
          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={errors.firstName ? 'error' : ''}
                />
                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={errors.lastName ? 'error' : ''}
                />
                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email * (for your invoice)</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Phone (for texting) *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={errors.phone ? 'error' : ''}
                  placeholder="604-123-4567"
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="notes">Flower Pick Up</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Please request your preferred pickup date and time. The flower farm will confirm by text message."
                rows="3"
              />
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => navigate('/shop')}
                className="back-to-shop"
              >
                Back to Shop
              </button>
              <button 
                type="submit" 
                className="place-order-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="order-summary">
          <h2>Order Summary</h2>
          <div className="cart-items">
            {cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-info">
                  <h3>{item.name}</h3>
                  <p className="item-price" data-label="Price:">${parseFloat(item.price).toFixed(2)} × {item.quantity}</p>
                </div>
                <p className="item-total" data-label="Subtotal:">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          
          <div className="order-total">
            <h3>Total</h3>
            <p className="total-price" data-label="Total:">${getTotal().toFixed(2)}</p>
          </div>
          
          <div className="order-note">
            <p>* This is a request for order only. We accept cash at pick-up or please send an etransfer to colleenhutton@gmail.com.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout; 