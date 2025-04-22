// src/pages/InvoicePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder } from '../services/firebase';
import { sendInvoiceEmail } from '../services/invoiceService'; // <-- import your service directly
import Invoice from '../components/Invoice';
import { toast } from 'react-hot-toast';
import '../styles/InvoicePage.css';

// Reusable Button component
const Button = ({ variant = 'primary', onClick, disabled, className, children }) => {
  const baseStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
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
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Email Button component (for access to OrderContext)
const EmailButton = ({ order }) => {
  const { sendInvoiceEmail, orderEmailStatus } = useOrders();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleEmailInvoice = async () => {
    if (!order?.customer?.email) {
      toast.error('Customer email is required to send invoice');
      return;
    }

    setSending(true);
    await sendInvoiceEmail(order, true);
  };

  useEffect(() => {
    if (sending) {
      if (orderEmailStatus.success) {
        toast.success('Invoice emailed successfully!');
        setSent(true);
        setSending(false);
      } else if (orderEmailStatus.error) {
        toast.error(`Failed to send invoice: ${orderEmailStatus.error}`);
        setSending(false);
      }
    }
  }, [orderEmailStatus, sending]);

  const isButtonDisabled = !order?.customer?.email || sending || orderEmailStatus?.loading;

  return (
    <Button
      variant="outline"
      onClick={handleEmailInvoice}
      className="email-invoice-button"
      disabled={isButtonDisabled}
    >
      {sending || orderEmailStatus?.loading ? 'Sending...' : sent ? '✅ Invoice Sent' : 'Email Invoice'}
    </Button>
  );
};

// Loading spinner component
const Loading = () => (
  <div className="loading-container">
    <h2>Loading Invoice...</h2>
    <div className="loading-spinner"></div>
  </div>
);

// Main InvoicePage
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
          ← Back to Orders
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

        <div className="invoice-action-buttons">
          <EmailButton order={order} />
          <Button variant="primary" onClick={handlePrint} className="print-button">
            Print Invoice
          </Button>
        </div>
      </div>

      <div className="invoice-page-body">
        <Invoice order={order} standalone={true} />
      </div>
    </div>
  );
};

export default InvoicePage;
