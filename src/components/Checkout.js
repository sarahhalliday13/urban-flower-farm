import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { updateInventory, saveOrder } from '../services/firebase';
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

  // Normal Hooks first - no conditions!
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
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
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await saveCustomerData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone
      });

      const currentYear = new Date().getFullYear();
      const timestamp = Date.now();
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
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
      const orderNumber = highestOrderNumber + 1;
      const newOrderId = `ORD-${currentYear}-${orderNumber}-${timestamp.toString().slice(-4)}`;
      
      const newOrderData = {
        id: newOrderId,
        date: new Date().toISOString(),
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          notes: formData.notes || '',
          address: {}
        },
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity, 10)
        })),
        total: cartItems.reduce((sum, item) => {
          const itemPrice = parseFloat(item.price) || 0;
          const itemQuantity = parseInt(item.quantity, 10) || 0;
          return sum + (itemPrice * itemQuantity);
        }, 0).toFixed(2),
        status: 'Processing'
      };

      const saveResult = await saveOrder(newOrderData);

      if (saveResult) {
        localStorage.setItem('orders', JSON.stringify([...orders, newOrderData]));
        localStorage.setItem('latestOrderId', newOrderId);
        window.dispatchEvent(new Event('orderCreated'));
        clearCart();
        navigate('/checkout/confirmation');
      } else {
        console.error('Failed to save order to Firebase');
      }

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

    } catch (error) {
      console.error('Error processing order:', error);
      setIsSubmitting(false);
      setErrors(prev => ({
        ...prev,
        submit: 'There was an error processing your order. Please try again.'
      }));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
          <p className="order-id">Order ID: <span>{orderId}</span></p>
          <p>A confirmation has been sent to <strong>{formData.email}</strong>.</p>
          <p>Please check your spam folder if you don't see it!</p>
          <button onClick={() => navigate('/shop')} className="continue-shopping-btn">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <h2>Checkout</h2>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="checkout-form">
        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" />
        {errors.firstName && <p className="error">{errors.firstName}</p>}
        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" />
        {errors.lastName && <p className="error">{errors.lastName}</p>}
        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
        {errors.email && <p className="error">{errors.email}</p>}
        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" />
        {errors.phone && <p className="error">{errors.phone}</p>}
        <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Flower Pick Up Notes" />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
};

export default Checkout; 