// src/pages/InvoicePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getOrder } from '../services/firebase';
import { sendInvoiceEmail } from '../services/invoiceService';
import Invoice from '../components/Invoice';
import { OrderProvider } from '../components/orders/OrderContext';
import { toast } from 'react-hot-toast';
import '../styles/InvoicePage.css';

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
    secondary: { backgroundColor: '#fff', color: '#2c5530', border: '1px solid #2c5530' },
    outline: { backgroundColor: 'transparent', color: '#2c5530', border: '1px solid #2c5530' },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...baseStyle, ...variantStyles[variant] }}
    >
      {children}
    </button>
  );
};

const EmailButton = ({ order }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleEmailInvoice = async () => {
    if (!order?.customer?.email) {
      toast.error('Customer email is required to send invoice');
      return;
    }

    try {
      setSending(true);

      const result = await sendInvoiceEmail(order);

      if (result.success) {
        toast.success('Invoice emailed successfully!');
        setSent(true);
      } else {
        toast.error(`🚨 Failed to send invoice: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Unexpected error sending invoice.');
    } finally {
      setSending(false);
    }
  };

  const isButtonDisabled = sending || !order?.customer?.email;

  return (
    <Button
      variant="outline"
      onClick={handleEmailInvoice}
      disabled={isButtonDisabled}
      className="email-invoice-button"
    >
      {sending ? 'Sending...' : sent ? '✅ Invoice Sent' : 'Email Invoice'}
    </Button>
  );
};

const Loading = () => (
  <div className="loading-container">
    <h2>Loading Invoice...</h2>
    <div className="loading-spinner"></div>
  </div>
);

const InvoicePage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the type parameter from URL (now, later, or all/default)
  const invoiceType = searchParams.get('type') || 'all';

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orderData = await getOrder(orderId);
        if (!orderData) {
          setError('Order not found');
        } else {
          // Enrich items with current inventory status if missing
          if (orderData.items && Array.isArray(orderData.items)) {
            const enrichedItems = await Promise.all(
              orderData.items.map(async (item) => {
                // If item already has inventoryStatus, keep it
                if (item.inventoryStatus) {
                  return item;
                }

                // Otherwise fetch from plants database
                try {
                  const response = await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/plants/${item.id}.json`);
                  const plantData = await response.json();
                  return {
                    ...item,
                    inventoryStatus: plantData?.inventory?.status || 'In Stock'
                  };
                } catch (error) {
                  console.error(`Error fetching inventory for ${item.name}:`, error);
                  return {
                    ...item,
                    inventoryStatus: 'In Stock' // Fallback
                  };
                }
              })
            );

            setOrder({
              ...orderData,
              items: enrichedItems
            });
          } else {
            setOrder(orderData);
          }
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleBack = () => navigate('/admin/orders');

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
    <OrderProvider>
      <div className="invoice-page">
        <div className="invoice-page-header non-printable">
          <Button variant="secondary" onClick={handleBack}>
            ← Back to Orders
          </Button>
          <div className="invoice-action-buttons">
            <EmailButton order={order} />
            <Button variant="secondary" onClick={handlePrint}>
              Print Invoice
            </Button>
          </div>
        </div>

        <div className="invoice-page-body">
          <Invoice order={order} standalone itemFilter={invoiceType} />
        </div>
      </div>
    </OrderProvider>
  );
};

export default InvoicePage;
