import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { updateInventory, saveOrder } from '../services/firebase';
import { getCustomerData, saveCustomerData } from '../services/customerService';
import { sendOrderConfirmationEmails } from '../services/emailService';
import GiftCertificateCheckoutFields from './GiftCertificateCheckoutFields';
import GiftCertificateRedemption from './GiftCertificateRedemption';
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
  const [comingSoonAccepted, setComingSoonAccepted] = useState(false);
  const [giftCertificateData, setGiftCertificateData] = useState({});
  const [appliedCertificates, setAppliedCertificates] = useState([]);

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

  // Helper function to check if an item is a gift certificate
  const isGiftCertificate = (item) => {
    return item.id && item.id.toString().startsWith('GC-');
  };

  // Get gift certificate items from cart
  const giftCertificateItems = cartItems.filter(isGiftCertificate);
  const hasGiftCertificates = giftCertificateItems.length > 0;

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

  const handleGiftCertificateChange = (itemId, field, value) => {
    setGiftCertificateData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const processGiftCertificates = async (orderData, giftCertItems) => {
    try {
      console.log('🎁 Starting gift certificate processing...');
      console.log('Order data:', orderData);
      console.log('Gift cert items:', giftCertItems);
      console.log('Gift cert data:', giftCertificateData);
      
      // Prepare gift certificate data for each item
      const certificatesData = giftCertItems.map(item => {
        const certData = giftCertificateData[item.id] || {};
        return {
          amount: parseFloat(item.price),
          recipientName: certData.recipientName || '',
          recipientEmail: certData.recipientEmail || '',
          senderName: certData.senderName || `${formData.firstName} ${formData.lastName}`,
          giftMessage: certData.giftMessage || '',
          quantity: item.quantity // Handle multiple certificates of same amount
        };
      });

      console.log('📋 Prepared certificates data:', certificatesData);

      // Flatten for multiple quantities
      const allCertificates = [];
      certificatesData.forEach(cert => {
        for (let i = 0; i < cert.quantity; i++) {
          allCertificates.push({
            amount: cert.amount,
            recipientName: cert.recipientName,
            recipientEmail: cert.recipientEmail,
            senderName: cert.senderName,
            giftMessage: cert.giftMessage
          });
        }
      });

      // Call Firebase function to generate certificates
      const functionsUrl = (typeof process !== 'undefined' && process.env?.REACT_APP_FIREBASE_FUNCTIONS_URL) || 
                          'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net';
      
      console.log('📡 Making request to:', `${functionsUrl}/generateGiftCertificate`);
      console.log('📦 Request payload:', {
        orderData,
        giftCertificates: allCertificates
      });
      
      const response = await fetch(`${functionsUrl}/generateGiftCertificate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderData,
          giftCertificates: allCertificates
        }),
      });

      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Failed to generate gift certificates: ${response.statusText}. ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Gift certificates generated successfully:', result);
      return result;

    } catch (error) {
      console.error('Error processing gift certificates:', error);
      throw error;
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

  // Calculate total with gift certificate discounts
  const calculateFinalTotal = () => {
    const subtotal = getTotal();
    const certificateDiscount = appliedCertificates.reduce((sum, cert) => sum + cert.appliedAmount, 0);
    return Math.max(0, subtotal - certificateDiscount);
  };

  // Handle gift certificate application
  const handleCertificateApplied = (certificate) => {
    setAppliedCertificates(prev => [...prev, certificate]);
  };

  // Handle gift certificate removal
  const handleCertificateRemoved = (certificateCode) => {
    setAppliedCertificates(prev => prev.filter(cert => cert.code !== certificateCode));
  };

  // Redeem certificates during order processing
  const redeemCertificates = async (orderId) => {
    const redemptionResults = [];
    
    // Use Firebase Functions URL - temporarily use deployed functions for local testing
    const baseUrl = 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net/api';
    
    for (const cert of appliedCertificates) {
      try {
        const response = await fetch(`${baseUrl}/redeemCertificate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            certificateCode: cert.code,
            amount: cert.appliedAmount,
            orderId: orderId
          })
        });

        const result = await response.json();
        redemptionResults.push({
          certificateCode: cert.code,
          success: result.success,
          redeemedAmount: cert.appliedAmount,
          remainingBalance: result.remainingBalance,
          error: result.error
        });
      } catch (error) {
        redemptionResults.push({
          certificateCode: cert.code,
          success: false,
          error: error.message,
          redeemedAmount: 0
        });
      }
    }

    return redemptionResults;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Check if total is valid
    const finalTotal = calculateFinalTotal();
    if (finalTotal < 0) {
      setErrors({ ...errors, submit: 'Gift certificate amount exceeds order total. Please adjust certificates.' });
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
          inventoryStatus: item.inventory?.status || 'In Stock'
        })),
        // Calculate the total directly from cart items to ensure accuracy
        total: cartItems.reduce((sum, item) => {
          const itemPrice = parseFloat(item.price) || 0;
          const itemQuantity = parseInt(item.quantity, 10) || 0;
          return sum + (itemPrice * itemQuantity);
        }, 0).toFixed(2),
        giftCertificatesApplied: appliedCertificates.map(cert => ({
          certificateCode: cert.code,
          appliedAmount: cert.appliedAmount,
          recipientName: cert.recipientName
        })),
        finalTotal: finalTotal.toFixed(2),
        status: 'Processing'
      };
      
      // Verify the calculated total matches getTotal() for debugging
      const calculatedTotal = parseFloat(newOrderData.total);
      const contextTotal = parseFloat(getTotal().toFixed(2));
      if (calculatedTotal !== contextTotal) {
        console.warn('Total mismatch:', {
          calculatedTotal,
          contextTotal,
          items: cartItems
        });
      }
      
      // Save the order to Firebase and localStorage
      try {
        await saveOrder(newOrderData);
        
        // Also save to localStorage for client-side access
        const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        localStorage.setItem('orders', JSON.stringify([...existingOrders, newOrderData]));
        localStorage.setItem('userEmail', formData.email.toLowerCase());
        
        // Redeem gift certificates if any were applied
        if (appliedCertificates.length > 0) {
          console.log(`🎫 Processing ${appliedCertificates.length} gift certificate redemption(s)...`);
          try {
            const redemptionResults = await redeemCertificates(newOrderId);
            console.log('✅ Gift certificate redemptions processed:', redemptionResults);
            
            // Check for any failed redemptions
            const failedRedemptions = redemptionResults.filter(result => !result.success);
            if (failedRedemptions.length > 0) {
              console.warn('⚠️ Some certificate redemptions failed:', failedRedemptions);
            }
          } catch (redemptionError) {
            console.error('❌ Error processing gift certificate redemptions:', redemptionError);
          }
        }

        // Send order confirmation emails
        try {
          await sendOrderConfirmationEmails(newOrderData);
          console.log('✅ Order confirmation emails sent successfully');
        } catch (emailError) {
          console.error('❌ Error sending order confirmation emails:', emailError);
        }

        // Process gift certificates if any exist
        if (hasGiftCertificates) {
          console.log(`🎁 Processing ${giftCertificateItems.length} gift certificate(s)...`);
          try {
            const result = await processGiftCertificates(newOrderData, giftCertificateItems);
            console.log('✅ Gift certificates processed successfully:', result);
          } catch (certificateError) {
            console.error('❌ Error processing gift certificates:', certificateError);
            // Show user-friendly error message
            const event = new CustomEvent('show-toast', {
              detail: {
                message: 'Gift certificates processed, but there was an issue with email delivery. Please contact us if you don\'t receive your certificates.',
                type: 'warning',
                duration: 8000
              }
            });
            window.dispatchEvent(event);
          }
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
          <p>We've received your order and will be in touch soon.</p>
          <p>A confirmation has been sent to <strong>{formData.email}</strong>.</p>
          <p className="spam-notice">Please check your spam folder if you don't see the email.</p>
          
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
                buttonsflowerfarm@telus.net
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
                    
                    navigator.clipboard.writeText('buttonsflowerfarm@telus.net')
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
            
            {/* Gift Certificate Fields */}
            {hasGiftCertificates && (
              <GiftCertificateCheckoutFields
                giftCertificateItems={giftCertificateItems}
                giftCertificateData={giftCertificateData}
                onGiftCertificateChange={handleGiftCertificateChange}
                customerName={`${formData.firstName} ${formData.lastName}`.trim()}
              />
            )}
            
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
            
            {errors.submit && (
              <div className="error-message" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                {errors.submit}
              </div>
            )}
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

          {/* Gift Certificate Redemption */}
          <GiftCertificateRedemption
            onCertificateApplied={handleCertificateApplied}
            onCertificateRemoved={handleCertificateRemoved}
            appliedCertificates={appliedCertificates}
            orderTotal={getTotal()}
          />
          
          <div className="order-total" style={{ width: '100%', margin: '0 -1.5rem', padding: '0 1.5rem' }}>
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Subtotal:</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
              {appliedCertificates.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#28a745', fontWeight: '500' }}>
                  <span>Gift Certificate:</span>
                  <span>-${appliedCertificates.reduce((sum, cert) => sum + cert.appliedAmount, 0).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Total:</h3>
              <p className="total-price" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                ${calculateFinalTotal().toFixed(2)}
              </p>
            </div>
            
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button 
                type="submit" 
                className="place-order-btn"
                disabled={isSubmitting}
                onClick={handleSubmit}
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
          
          <div className="order-note">
            <p>We accept cash at pick-up,</p>
            <p>or etransfer to&nbsp;<span className="email-with-copy">
              buttonsflowerfarm@telus.net
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
                  
                  navigator.clipboard.writeText('buttonsflowerfarm@telus.net')
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
