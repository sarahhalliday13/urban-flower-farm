import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { updateInventory, saveOrder } from '../services/firebase';
import { getCustomerData, saveCustomerData } from '../services/customerService';
import { sendOrderConfirmationEmails } from '../services/emailService';
import '../styles/Checkout.css';

const Checkout = () => {
  const { cartItems, getSubtotal, getGST, getPST, getTotal, clearCart } = useCart();
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
  const [completedOrder, setCompletedOrder] = useState(null);
  const [inventoryUpdateStatus, setInventoryUpdateStatus] = useState(null);
  const [comingSoonAccepted, setComingSoonAccepted] = useState(false);

  // Move all useEffect hooks before conditional return
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

  useEffect(() => {
    // Always check cart status
    if (cartItems.length === 0 && !orderComplete && location.pathname !== '/checkout/confirmation') {
      navigate('/shop');
    }
  }, [cartItems, navigate, orderComplete, location.pathname]);

  useEffect(() => {
    // Always check if on confirmation page
    if (location.pathname === '/checkout/confirmation') {
      const latestOrderId = localStorage.getItem('latestOrderId');
      if (latestOrderId) {
        const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        const foundOrder = allOrders.find(order => order.id === latestOrderId);
        if (foundOrder) {
          setOrderComplete(true);
          setOrderId(foundOrder.id);
          setCompletedOrder(foundOrder);
          setFormData(prevData => ({
            ...prevData,
            firstName: foundOrder.customer.firstName,
            lastName: foundOrder.customer.lastName,
            email: foundOrder.customer.email,
            phone: foundOrder.customer.phone,
            notes: foundOrder.customer.notes || ''
          }));
        } else {
          navigate('/shop');
        }
      } else {
        navigate('/shop');
      }
    }
  }, [location.pathname, navigate]);

  // Early return to prevent rendering with empty cart - AFTER all hooks
  if (cartItems.length === 0 && !orderComplete && location.pathname !== '/checkout/confirmation') {
    return null; // Don't render broken page, wait for navigate
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
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
    
    // Coming Soon checkbox validation
    const hasComingSoonItems = cartItems.some(item => item.inventory?.status === 'Coming Soon');
    if (hasComingSoonItems && !comingSoonAccepted) {
      newErrors.comingSoon = 'Please acknowledge that Coming Soon items are not immediately available';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Check if total is valid
    const orderTotal = getTotal();
    if (orderTotal <= 0) {
      setErrors({ ...errors, submit: 'Order total must be greater than $0. Please check your cart items.' });
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
      const currentYear = new Date().getFullYear();
      const timestamp = Date.now(); // Add timestamp to ensure uniqueness
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      
      // Find the highest order number from localStorage
      let highestOrderNumber = 1000;
      orders.forEach(order => {
        if (order.id && order.id.startsWith('ORD-')) {
          const parts = order.id.split('-');
          if (parts.length >= 3) {
            const orderNum = parseInt(parts[2], 10);
            if (!isNaN(orderNum) && orderNum > highestOrderNumber) {
              highestOrderNumber = orderNum;
            }
          }
        }
      });
      
      // Create a unique order ID using timestamp and incremented order number
      const orderNumber = highestOrderNumber + 1;
      const newOrderId = `ORD-${currentYear}-${orderNumber}-${timestamp.toString().slice(-4)}`;
      
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
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity, 10),
          inventoryStatus: item.inventory?.status || 'In Stock',
          // Auto-set invoiceNow based on inventory status
          // In Stock items should be invoiced immediately, Pre-Order items invoiced later
          invoiceNow: item.inventory?.status !== 'Pre-Order' && item.inventory?.status !== 'Coming Soon'
        })),
        // Calculate subtotal, taxes, and total
        subtotal: parseFloat(getSubtotal().toFixed(2)),
        gst: parseFloat(getGST().toFixed(2)),
        pst: parseFloat(getPST().toFixed(2)),
        total: parseFloat(getTotal().toFixed(2)),
        status: 'Processing',
        // Initialize payment tracking fields
        invoiceNowPaid: false,
        invoiceLaterPaid: false
      };
      
      // Save the order to Firebase and localStorage
      try {
        await saveOrder(newOrderData);
        
        // Also save to localStorage for client-side access
        const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        localStorage.setItem('orders', JSON.stringify([...existingOrders, newOrderData]));
        localStorage.setItem('userEmail', formData.email.toLowerCase());
        
        // Send order confirmation emails
        try {
          await sendOrderConfirmationEmails(newOrderData);
          console.log('✅ Order confirmation emails sent successfully');
        } catch (emailError) {
          console.error('❌ Error sending order confirmation emails:', emailError);
        }
        
        // Dispatch the orderCreated event to update the navigation
        window.dispatchEvent(new Event('orderCreated'));
      } catch (firebaseError) {
        console.error('Error saving order to Firebase:', firebaseError);
        // If Firebase fails, still save to localStorage as fallback
        const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        localStorage.setItem('orders', JSON.stringify([...existingOrders, newOrderData]));
        localStorage.setItem('userEmail', formData.email.toLowerCase());
        
        // Still try to send emails even if Firebase fails
        try {
          await sendOrderConfirmationEmails(newOrderData);
          console.log('✅ Order confirmation emails sent successfully (after Firebase error)');
        } catch (emailError) {
          console.error('❌ Error sending order confirmation emails:', emailError);
        }
        
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
        console.error('⚠️ Inventory update error:', inventoryError);
        setInventoryUpdateStatus('warning');
      }
      
      // Clear cart
      clearCart();
      setIsSubmitting(false);
      
      // Navigate to confirmation page
      navigate('/checkout/confirmation');
    } catch (error) {
      console.error('❌ Error during checkout:', error);
      setErrors({ ...errors, submit: 'There was an error processing your order. Please try again.' });
      setIsSubmitting(false);
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
          <p>We've received your order and will be in touch soon. A confirmation email has been sent to <strong>{formData.email}</strong>.</p>
          <p className="spam-notice">Please check your spam folder if you don't see the email.</p>

          <div className="pickup-confirmation">
            <h3>Pickup Information</h3>
            <p>For items that are in stock, we will confirm your pickup date and time by text message to <strong>{formData.phone}</strong>.</p>
            {formData.notes && (
              <div className="requested-pickup">
                <p><strong>Your requested pickup:</strong></p>
                <p>{formData.notes}</p>
              </div>
            )}
          </div>

          {completedOrder && (() => {
            // Check if order has mixed invoicing
            const invoiceNowItems = completedOrder.items?.filter(item => !item.isFreebie && (item.invoiceNow !== false)) || [];
            const invoiceLaterItems = completedOrder.items?.filter(item => !item.isFreebie && (item.invoiceNow === false)) || [];
            const hasMixedInvoicing = invoiceNowItems.length > 0 && invoiceLaterItems.length > 0;

            // Calculate split totals
            const invoiceNowSubtotal = invoiceNowItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const invoiceLaterSubtotal = invoiceLaterItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            return (
              <div className="order-summary-confirmation">
                <h3>Order Summary</h3>
                <div className="confirmed-items">
                  {completedOrder.items && completedOrder.items.map((item, index) => {
                    // Determine status badge
                    const status = item.inventoryStatus || 'In Stock';
                    const getBadgeStyle = (status) => {
                      switch(status) {
                        case 'Pre-Order':
                          return { backgroundColor: '#e3f2fd', color: '#1976d2', border: '1px solid #1976d2' };
                        case 'Coming Soon':
                          return { backgroundColor: '#fff3e0', color: '#f57c00', border: '1px solid #f57c00' };
                        case 'In Stock':
                        default:
                          return { backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #2e7d32' };
                      }
                    };

                    return (
                      <div key={index} className="confirmed-item">
                        <span className="item-name">
                          {item.name} × {item.quantity}
                          <span style={{
                            ...getBadgeStyle(status),
                            marginLeft: '8px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75em',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            {status}
                          </span>
                        </span>
                        <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="confirmed-totals">
                  {hasMixedInvoicing ? (
                    <>
                      {/* Invoice Now Section */}
                      <div className="confirmed-total-row" style={{marginTop: '15px', paddingTop: '10px', borderTop: '2px solid #2c5530', backgroundColor: '#e8f5e9'}}>
                        <span><strong>READY FOR PICKUP (In Stock)</strong></span>
                        <span></span>
                      </div>
                      <div className="confirmed-total-row">
                        <span>Sub-total:</span>
                        <span>${invoiceNowSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="confirmed-total-row">
                        <span>GST (5%):</span>
                        <span>${(invoiceNowSubtotal * 0.05).toFixed(2)}</span>
                      </div>
                      <div className="confirmed-total-row">
                        <span>PST (7%):</span>
                        <span>${(invoiceNowSubtotal * 0.07).toFixed(2)}</span>
                      </div>
                      <div className="confirmed-total-row" style={{backgroundColor: '#e8f5e9', fontWeight: 'bold'}}>
                        <span><strong>Invoice Total:</strong></span>
                        <span><strong>${(invoiceNowSubtotal * 1.12).toFixed(2)}</strong></span>
                      </div>
                      <div className="confirmed-total-row" style={{fontSize: '0.9em', fontStyle: 'italic', color: '#666', paddingTop: '5px'}}>
                        <span>We'll invoice you for payment</span>
                        <span></span>
                      </div>

                      {/* Invoice Later Section */}
                      <div className="confirmed-total-row" style={{marginTop: '15px', paddingTop: '10px', borderTop: '2px solid #3498db', backgroundColor: '#e3f2fd'}}>
                        <span><strong>PRE-ORDER (Invoice on Delivery)</strong></span>
                        <span></span>
                      </div>
                      <div className="confirmed-total-row">
                        <span>Sub-total:</span>
                        <span>${invoiceLaterSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="confirmed-total-row" style={{fontSize: '0.9em', fontStyle: 'italic', color: '#666'}}>
                        <span>Will be invoiced when ready</span>
                        <span></span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Standard Single Invoice */}
                      <div className="confirmed-total-row">
                        <span>Sub-total:</span>
                        <span>${completedOrder.subtotal ? completedOrder.subtotal.toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="confirmed-total-row">
                        <span>GST (5%):</span>
                        <span>${completedOrder.gst ? completedOrder.gst.toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="confirmed-total-row">
                        <span>PST (7%):</span>
                        <span>${completedOrder.pst ? completedOrder.pst.toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="confirmed-total-row final">
                        <span><strong>Total:</strong></span>
                        <span><strong>${completedOrder.total ? completedOrder.total.toFixed(2) : '0.00'}</strong></span>
                      </div>
                    </>
                  )}
                </div>
                <p style={{textAlign: 'center', marginTop: '15px', fontStyle: 'italic', color: '#666'}}>
                  This is your order summary. A separate invoice will be sent for payment.
                </p>
              </div>
            );
          })()}

          {inventoryUpdateStatus === 'warning' && (
            <p className="inventory-warning">
              Note: There may have been issues updating our inventory system.
              Our team will review your order manually.
            </p>
          )}
          
          <div className="order-actions">
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
            
            {/* Coming Soon Acknowledgment Checkbox */}
            {cartItems.some(item => item.inventory?.status === 'Coming Soon') && (
              <div className="form-group coming-soon-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={comingSoonAccepted}
                    onChange={(e) => {
                      setComingSoonAccepted(e.target.checked);
                      if (errors.comingSoon) {
                        setErrors(prev => ({ ...prev, comingSoon: null }));
                      }
                    }}
                  />
                  <span>I understand that items marked 'Coming Soon' are not immediately available</span>
                </label>
                {errors.comingSoon && <span className="error-message">{errors.comingSoon}</span>}
              </div>
            )}
            
            <div className="form-actions">
              {errors.submit && (
                <div className="error-message" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  {errors.submit}
                </div>
              )}
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
          
          {/* Coming Soon Warning */}
          {cartItems.some(item => item.inventory?.status === 'Coming Soon') && (
            <div className="coming-soon-warning">
              <span className="warning-icon">⚠️</span>
              <p>Note: Some items in your cart are marked as 'Coming Soon' and will be available at a later date. We'll be in touch when they're available.</p>
            </div>
          )}
          
          <div className="cart-items">
            {cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-details">
                  <div className="item-header">
                    <h3>{item.name}</h3>
                    {item.inventory?.status === 'Coming Soon' && (
                      <span className="coming-soon-badge">Coming Soon</span>
                    )}
                  </div>
                  <p className="item-price">Price: ${parseFloat(item.price).toFixed(2)} × {item.quantity}</p>
                </div>
                <div className="item-subtotal">
                  <p className="subtotal-label">Subtotal:</p>
                  <p className="subtotal-amount">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="order-total">
            <div className="total-breakdown">
              <div className="total-row final-total-row">
                <span>Total:</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="order-note">
            <p>This is your order summary. A separate invoice will be sent for payment which will also include GST + PST.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
