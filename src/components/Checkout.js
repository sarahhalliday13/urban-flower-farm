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
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [inventoryUpdateStatus, setInventoryUpdateStatus] = useState(null);

  useEffect(() => {
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
  }, [location, navigate]);

  useEffect(() => {
    if (cartItems.length === 0 && !orderComplete && location.pathname !== '/checkout/confirmation') {
      navigate('/shop');
    }
  }, [cartItems, navigate, orderComplete, location.pathname]);

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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
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
      await saveCustomerData({ firstName: formData.firstName, lastName: formData.lastName, email: formData.email, phone: formData.phone });

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
        customer: { firstName: formData.firstName, lastName: formData.lastName, email: formData.email, phone: formData.phone, notes: formData.notes || '' },
        items: cartItems.map(item => ({ id: item.id, name: item.name, price: parseFloat(item.price), quantity: parseInt(item.quantity, 10) })),
        total: cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity, 10)), 0).toFixed(2),
        status: 'Processing'
      };

      console.log('📦 Saving order:', newOrderData.id);
      const saveResult = await saveOrder(newOrderData);
      if (!saveResult) throw new Error('❌ Failed to save order or send email');

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

      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      localStorage.setItem('orders', JSON.stringify([...existingOrders, newOrderData]));
      localStorage.setItem('userEmail', formData.email.toLowerCase());
      localStorage.setItem('latestOrderId', newOrderId);

      window.dispatchEvent(new Event('orderCreated'));
      clearCart();

      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/checkout/confirmation');

    } catch (error) {
      console.error('❌ Error during checkout:', error);
      setErrors({ ...errors, submit: 'There was an error processing your order. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName.toLowerCase() !== 'textarea') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // --- Your rendering code continues below ---

  // (I can also paste the full rendering section if you want, but this is the main fixed logic for submission.)

  return (
    <div className="checkout-container">
      {/* Checkout form and confirmation rendering here */}
    </div>
  );
};

export default Checkout;
