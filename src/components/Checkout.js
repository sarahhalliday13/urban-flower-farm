import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { updateInventory, saveOrder } from '../services/firebase';
import { sendOrderConfirmationEmails } from '../services/emailService';
import { getCustomerData, saveCustomerData } from '../services/customerService';
import '../styles/Checkout.css';

const Checkout = () => {
  const { cartItems, getTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [inventoryUpdateStatus, setInventoryUpdateStatus] = useState(null);

  // Check if we're on the confirmation page
  useEffect(() => {
    if (location.pathname === '/checkout/confirmation') {
      // Get the latest order ID from localStorage
      const latestOrderId = localStorage.getItem('latestOrderId');
      
      if (latestOrderId) {
        // Find the order in the orders array
        const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        const foundOrder = allOrders.find(order => order.id === latestOrderId);
        
        if (foundOrder) {
          // Set state with the found order
          setOrderComplete(true);
          setOrderId(foundOrder.id);
          setFormData(prevData => ({
            ...prevData,
            firstName: foundOrder.customer.firstName,
            lastName: foundOrder.customer.lastName,
            email: foundOrder.customer.email,
            phone: foundOrder.customer.phone,
            notes: foundOrder.customer.notes || ''
          }));
        } else {
          // No order found, redirect to shop
          navigate('/shop');
        }
      } else {
        // No order ID in localStorage, redirect to shop
        navigate('/shop');
      }
    }
  }, [location, navigate]);

  useEffect(() => {
    // Redirect to shop if cart is empty and not on confirmation page
    if (cartItems.length === 0 && !orderComplete && location.pathname !== '/checkout/confirmation') {
      navigate('/shop');
    }
  }, [cartItems, navigate, orderComplete, location.pathname]);

  // Add useEffect to load saved customer data
  useEffect(() => {
    const savedCustomerData = getCustomerData();
    if (savedCustomerData) {
      setFormData(prev => ({
        ...prev,
        firstName: savedCustomerData.firstName || '',
        lastName: savedCustomerData.lastName || '',
        email: savedCustomerData.email || '',
        phone: savedCustomerData.phone || ''
      }));
    }
  }, []);

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
      // Save customer data for future use
      await saveCustomerData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone
      });

      // Generate a unique order ID
      const newOrderId = `ORD-${Date.now()}`;
      
      // Format the order data
      const newOrderData = {
        id: newOrderId,
        date: new Date().toISOString(),
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          notes: formData.notes || '',
          address: {
            street: formData.street || '',
            city: formData.city || '',
            state: formData.state || '',
            zip: formData.zip || ''
          }
        },
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total: getTotal().toFixed(2),
        status: 'Processing'
      };
      
      // Save the order to Firebase and localStorage
      try {
        await saveOrder(newOrderData);
        
        // Send confirmation emails
        await sendOrderConfirmationEmails(newOrderData);
        
        // Also save to localStorage for client-side access
        const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        localStorage.setItem('orders', JSON.stringify([...existingOrders, newOrderData]));
        localStorage.setItem('userEmail', formData.email.toLowerCase());
        
        // Dispatch the orderCreated event to update the navigation
        window.dispatchEvent(new Event('orderCreated'));
      } catch (firebaseError) {
        console.error('Error saving order to Firebase:', firebaseError);
        // If Firebase fails, still save to localStorage as fallback
        const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        localStorage.setItem('orders', JSON.stringify([...existingOrders, newOrderData]));
        localStorage.setItem('userEmail', formData.email.toLowerCase());
        
        // Still dispatch the event even if Firebase fails, since we saved to localStorage
        window.dispatchEvent(new Event('orderCreated'));
      }
      
      // Save the latest order ID for the confirmation page
      localStorage.setItem('latestOrderId', newOrderId);
      
      // Update inventory using Firebase
      try {
        for (const item of cartItems) {
          await updateInventory(item.id, {
            currentStock: Math.max(0, (item.inventory?.currentStock || 0) - item.quantity),
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (inventoryError) {
        console.error('Error updating inventory:', inventoryError);
        setInventoryUpdateStatus('warning');
      }
      
      // Clear cart
      clearCart();
      setIsSubmitting(false);
      
      // Navigate to confirmation page
      navigate('/checkout/confirmation');
    } catch (error) {
      console.error('Error processing order:', error);
      setIsSubmitting(false);
      setErrors({
        ...errors,
        submit: 'There was an error processing your order. Please try again.'
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Only prevent default for non-textarea elements
      if (e.target.tagName.toLowerCase() !== 'textarea') {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  if (orderComplete) {
    return (
      <div className="checkout-container">
        <div className="order-confirmation">
          <h2>Thank You for Your Order!</h2>
          <p className="order-id">Order ID: <span>{orderId}</span>
            <button 
              className="copy-email-btn" 
              onClick={(e) => {
                e.preventDefault();
                const btn = e.currentTarget;
                const svgElement = btn.querySelector('svg');
                const textElement = btn.querySelector('.copy-text');
                
                // Hide SVG, show "Copied" text
                if (svgElement) svgElement.style.display = 'none';
                if (textElement) textElement.style.display = 'inline';
                
                navigator.clipboard.writeText(orderId)
                  .then(() => {
                    // Show tooltip
                    btn.classList.add('copied');
                    
                    // Reset button after 2 seconds
                    setTimeout(() => {
                      btn.classList.remove('copied');
                      if (svgElement) svgElement.style.display = 'inline';
                      if (textElement) textElement.style.display = 'none';
                    }, 2000);
                  })
                  .catch(err => {
                    console.error('Failed to copy text: ', err);
                  });
              }}
              title="Copy order number"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span className="copy-text">Copied</span>
              <span className="copy-tooltip">Copied!</span>
            </button>
          </p>
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
              <li><strong>E-Transfer:</strong> Send to <span className="email-with-copy">
                buttonsflowerfarm@gmail.com
                <button 
                  className="copy-email-btn" 
                  onClick={(e) => {
                    e.preventDefault();
                    const btn = e.currentTarget;
                    const svgElement = btn.querySelector('svg');
                    const textElement = btn.querySelector('.copy-text');
                    
                    // Hide SVG, show "Copied" text
                    if (svgElement) svgElement.style.display = 'none';
                    if (textElement) textElement.style.display = 'inline';
                    
                    navigator.clipboard.writeText('buttonsflowerfarm@gmail.com')
                      .then(() => {
                        // Show tooltip
                        btn.classList.add('copied');
                        
                        // Reset button after 2 seconds
                        setTimeout(() => {
                          btn.classList.remove('copied');
                          if (svgElement) svgElement.style.display = 'inline';
                          if (textElement) textElement.style.display = 'none';
                        }, 2000);
                      })
                      .catch(err => {
                        console.error('Failed to copy text: ', err);
                      });
                  }}
                  title="Copy email address"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span className="copy-text">Copied</span>
                  <span className="copy-tooltip">Copied!</span>
                </button>
              </span></li>
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
      <div className="featured-plants-header">
        <h2>Checkout</h2>
      </div>
      
      <div className="checkout-content">
        <div className="checkout-form-container">
          <h2>Contact Information</h2>
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="checkout-form">
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
                <label htmlFor="email">Email *</label>
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
                <label htmlFor="phone">Phone *</label>
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
            <p>We accept cash at pick-up,</p>
            <p>or etransfer to&nbsp;<span className="email-with-copy">
              buttonsflowerfarm@gmail.com
              <button 
                className="copy-email-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  const btn = e.currentTarget;
                  const svgElement = btn.querySelector('svg');
                  const textElement = btn.querySelector('.copy-text');
                  
                  // Hide SVG, show "Copied" text
                  if (svgElement) svgElement.style.display = 'none';
                  if (textElement) textElement.style.display = 'inline';
                  
                  navigator.clipboard.writeText('buttonsflowerfarm@gmail.com')
                    .then(() => {
                      // Show tooltip
                      btn.classList.add('copied');
                      
                      // Reset button after 2 seconds
                      setTimeout(() => {
                        btn.classList.remove('copied');
                        if (svgElement) svgElement.style.display = 'inline';
                        if (textElement) textElement.style.display = 'none';
                      }, 2000);
                    })
                    .catch(err => {
                      console.error('Failed to copy text: ', err);
                    });
                }}
                title="Copy email address"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span className="copy-text">Copied</span>
                <span className="copy-tooltip">Copied!</span>
              </button>
            </span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout; 