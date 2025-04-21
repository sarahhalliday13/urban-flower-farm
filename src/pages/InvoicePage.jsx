import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder } from '../services/firebase';
import Invoice from '../components/Invoice';
import '../styles/InvoicePage.css';
import { OrderProvider, useOrders } from '../components/orders/OrderContext';
import { toast } from 'react-hot-toast';

// Simple loading component
const Loading = () => (
  <div className="loading-container">
    <h2>Loading Invoice...</h2>
    <div className="loading-spinner"></div>
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
    textAlign: 'center',
  };

  const variantStyles = {
    primary: { backgroundColor: '#2c5530', color: '#fff' },
    secondary: { backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #ddd' },
    outline: { backgroundColor: 'transparent', color: '#2c5530', border: '1px solid #2c5530' },
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

// Email Button component (for access to OrderContext)
const EmailButton = ({ order }) => {
  const { sendInvoiceEmail, orderEmailStatus } = useOrders();
  const [sending, setSending] = useState(false);

  const handleEmailInvoice = async () => {
    if (!order?.customer?.email) {
      toast.error('Customer email is required to send invoice');
      return;
    }

    setSending(true);
    await sendInvoiceEmail(order, true);
    
    if (orderEmailStatus.success) {
      toast.success('Invoice email sent successfully');
    } else if (orderEmailStatus.error) {
      toast.error(`Failed to send invoice email: ${orderEmailStatus.error}`);
    }
    
    setSending(false);
  };

  const isButtonDisabled = !order?.customer?.email || sending || orderEmailStatus?.loading;
  
  return (
    <Button 
      variant="outline" 
      onClick={handleEmailInvoice} 
      className="email-top-button"
      disabled={isButtonDisabled}
    >
      {sending || orderEmailStatus?.loading ? 'Sending...' : 'Email Invoice'}
    </Button>
  );
};

const InvoicePage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    document.documentElement.classList.add('printing');
    window.print();
    setTimeout(() => {
      document.documentElement.classList.remove('printing');
    }, 1000);
  };

  if (loading) return <Loading />;

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
      <div className="invoice-page-header non-printable">
        <Button variant="secondary" onClick={handleBack} className="back-button">
          ← Back to Orders
        </Button>
        <h2>Invoice #{order.id}</h2>
        <div className="invoice-action-buttons">
          <OrderProvider>
            <EmailButton order={order} />
          </OrderProvider>
          <Button variant="primary" onClick={handlePrint} className="print-button">
            Print Invoice
          </Button>
        </div>
      </div>

      <div className="invoice-page-body">
        <OrderProvider>
          <Invoice order={order} standalone={true} />
        </OrderProvider>
      </div>
    </div>
  );
};

export default InvoicePage;
