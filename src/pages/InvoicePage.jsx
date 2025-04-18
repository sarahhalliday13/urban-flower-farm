import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder } from '../services/firebase';
import Invoice from '../components/Invoice';
import '../styles/InvoicePage.css';

// Simple loading component
const Loading = () => (
  <div className="loading-container" style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Loading Invoice</h2>
    <div className="loading-spinner" style={{ 
      display: 'inline-block',
      width: '30px',
      height: '30px',
      border: '3px solid rgba(0,0,0,0.1)',
      borderRadius: '50%',
      borderTopColor: '#2c5530',
      animation: 'spin 1s linear infinite',
      margin: '20px auto'
    }}></div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Simple Button component
const Button = ({ variant = 'primary', onClick, className, children }) => {
  const baseStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    display: 'inline-block',
    textAlign: 'center'
  };
  
  const variantStyles = {
    primary: {
      backgroundColor: '#2c5530',
      color: '#fff'
    },
    secondary: {
      backgroundColor: '#f8f9fa',
      color: '#333',
      border: '1px solid #ddd'
    }
  };
  
  return (
    <button 
      onClick={onClick}
      className={className}
      style={{ ...baseStyle, ...variantStyles[variant] }}
    >
      {children}
    </button>
  );
};

const InvoicePage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format currency helper function
  const formatCurrency = (amount) => {
    return parseFloat(amount).toFixed(2);
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const orderData = await getOrder(orderId);
        
        if (!orderData) {
          setError('Order not found');
        } else {
          setOrder(orderData);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleBack = () => {
    navigate(-1);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="invoice-page error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Button variant="secondary" onClick={handleBack}>
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="invoice-page">
      <div className="invoice-page-header">
        <Button 
          variant="secondary" 
          onClick={handleBack}
          className="back-button non-printable"
        >
          Back to Orders
        </Button>
        <h2>Invoice #{order.id}</h2>
        <Button 
          variant="primary" 
          onClick={handlePrint}
          className="print-button non-printable"
        >
          Print Invoice
        </Button>
      </div>
      
      <div className="invoice-container">
        <Invoice order={order} standalone={true} />
      </div>
    </div>
  );
};

export default InvoicePage; 