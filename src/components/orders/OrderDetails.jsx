import React, { useState, useEffect } from 'react';
import { useOrders } from './OrderContext';
import OrderItemsTable from './OrderItemsTable';
import Invoice from '../Invoice';
import OrderEditor from './OrderEditor';

/**
 * OrderDetails - Expanded view for selected order
 * Displays order details, customer info, status controls, and invoice options
 * Refactored to use a cleaner 2-column layout with simplified structure
 */
const OrderDetails = () => {
  const { 
    orders, 
    activeOrder, 
    setActiveOrder, 
    handleStatusUpdate, 
    showInvoice, 
    setShowInvoice,
    showCancelConfirm,
    setShowCancelConfirm,
    pendingStatusUpdate,
    setPendingStatusUpdate,
    confirmCancelOrder,
    sendOrderEmail,
    emailSending,
    updateOrderDiscount,
    updateOrderPayment,
    updateOrderItems,
    finalizeOrder
  } = useOrders();
  
  // State for discount editing
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  
  // State for payment method editing
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentTiming, setPaymentTiming] = useState('');
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  
  // State for order editing
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  
  // Find the active order details
  const orderDetails = activeOrder ? orders.find(order => order.id === activeOrder) : null;
  
  // Initialize the discount states from order if available
  useEffect(() => {
    if (orderDetails?.discount) {
      setDiscountAmount(orderDetails.discount.amount || '');
      setDiscountReason(orderDetails.discount.reason || '');
    } else {
      setDiscountAmount('');
      setDiscountReason('');
    }
    setIsEditingDiscount(false);
    
    // Initialize payment method state
    if (orderDetails?.payment) {
      setPaymentMethod(orderDetails.payment.method || '');
      setPaymentTiming(orderDetails.payment.timing || '');
    } else {
      setPaymentMethod('');
      setPaymentTiming('');
    }
    setIsEditingPayment(false);
    
    // Reset editing state when changing orders
    setIsEditingOrder(false);
  }, [orderDetails?.id, orderDetails?.discount, orderDetails?.payment]);
  
  // If no active order, don't render anything
  if (!activeOrder) return null;
  
  // If order details not found, don't render anything
  if (!orderDetails) return null;
  
  const closeInvoice = () => {
    setShowInvoice(null);
  };

  // Handle saving the discount
  const handleSaveDiscount = () => {
    const amount = parseFloat(discountAmount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid discount amount');
      return;
    }

    updateOrderDiscount(orderDetails.id, {
      amount,
      reason: discountReason,
      type: 'amount' // Currently we only support fixed amount discounts
    });
    
    setIsEditingDiscount(false);
  };
  
  // Handle saving the payment method
  const handleSavePayment = () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    updateOrderPayment(orderDetails.id, {
      method: paymentMethod,
      timing: paymentTiming,
      updatedAt: new Date().toISOString()
    });
    
    setIsEditingPayment(false);
  };

  // Calculate subtotal from items
  const calculateSubtotal = () => {
    if (!Array.isArray(orderDetails.items)) return 0;
    
    return orderDetails.items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      return sum + (price * quantity);
    }, 0);
  };

  // Get discount amount
  const getDiscountAmount = () => {
    if (isEditingDiscount) {
      // Use the current editing value when editing
      return parseFloat(discountAmount) || 0;
    } else {
      // Use the stored discount value from order
      return parseFloat(orderDetails.discount?.amount || 0);
    }
  };

  // Get final total after discount
  const getFinalTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = getDiscountAmount();
    return Math.max(0, subtotal - discount);
  };
  
  // Helper to format payment method for display
  const formatPaymentMethod = (method) => {
    if (!method) return 'Not specified';
    
    // Capitalize first letter of each word
    return method.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  // Helper to format payment timing for display
  const formatPaymentTiming = (timing) => {
    if (!timing) return '';
    
    return timing.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Get email status with date if available
  const getEmailStatus = () => {
    try {
      // Check manualEmails in localStorage
      const manualEmails = JSON.parse(localStorage.getItem('manualEmails') || '[]');
      const orderEmail = manualEmails.find(email => email.orderId === orderDetails.id);
      
      if (orderEmail) {
        if (orderEmail.status === 'sent') {
          const sentDate = orderEmail.sentDate ? new Date(orderEmail.sentDate).toLocaleDateString() : '';
          return <span className="email-status sent">✅ Email sent manually {sentDate && `on ${sentDate}`}</span>;
        } else {
          return <span className="email-status pending">❌ Email pending</span>;
        }
      }
      
      // If order has emailSent property
      if (orderDetails.emailSent) {
        return <span className="email-status sent">✅ Email sent</span>;
      }
      
      // If no manual email record
      return <span className="email-status unknown">❌ No email sent</span>;
    } catch (error) {
      console.error('Error checking email status:', error);
      return <span className="email-status error">❌ Error checking status</span>;
    }
  };

  // Helper to safely convert status to lowercase
  const statusToLowerCase = (status) => {
    return status && typeof status === 'string' ? status.toLowerCase() : '';
  };

  // Determine if a status is active, completed, or pending
  const getStatusClass = (statusName) => {
    const currentStatus = statusToLowerCase(orderDetails.status);
    const statusValue = statusToLowerCase(statusName);
    
    if (currentStatus === 'cancelled') {
      return statusValue === 'cancelled' ? 'active' : 'disabled';
    }
    
    const statusOrder = ['pending', 'processing', 'shipped', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const statusIndex = statusOrder.indexOf(statusValue);
    
    if (statusIndex === currentIndex) return 'active';
    if (statusIndex < currentIndex) return 'completed';
    return 'pending';
  };

  // Helper to highlight pickup keywords in notes
  const formatNotes = (notes) => {
    if (!notes) return "No notes provided";
    
    // Highlight keywords related to pickup
    const highlightKeywords = /(pickup|pick up|pick-up|collect|schedule)/gi;
    return notes.replace(
      highlightKeywords,
      match => `<span class="highlight-keyword">${match}</span>`
    );
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return parseFloat(amount).toFixed(2);
  };

  return (
    <div className="order-details-container">
      <button className="close-details-btn" onClick={() => setActiveOrder(null)}>×</button>
      
      {isEditingOrder ? (
        <OrderEditor 
          orderId={activeOrder} 
          closeModal={() => setIsEditingOrder(false)} 
        />
      ) : (
        <div className="order-details-grid">
          {/* Left Column */}
          <div className="order-details-left">
            {/* Items header with edit button */}
            <div className="items-header">
              <h3>Items</h3>
              <button 
                className="edit-order-btn"
                onClick={() => setIsEditingOrder(true)}
              >
                Edit Order
              </button>
            </div>
            
            <OrderItemsTable 
              items={Array.isArray(orderDetails.items) ? orderDetails.items : []} 
              total={orderDetails.total || 0} 
            />
            
            <div className="customer-info-compact">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> {orderDetails.customer.name}</p>
              <p><strong>Email:</strong> {orderDetails.customer.email}</p>
              <p><strong>Phone:</strong> {orderDetails.customer.phone ? (
                <a href={`tel:${orderDetails.customer.phone}`} style={{ color: '#2c5530', textDecoration: 'none' }}>
                  {orderDetails.customer.phone}
                </a>
              ) : 'Not provided'}</p>
              
              {(orderDetails.customer.notes || orderDetails.notes) && (
                <div className="pickup-notes">
                  <h4>Customer Notes:</h4>
                  <div className="notes-highlight pickup-note">
                    <p dangerouslySetInnerHTML={{ __html: formatNotes(orderDetails.customer.notes || orderDetails.notes) }}></p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="email-summary">
              <button 
                className="email-invoice-btn"
                onClick={() => sendOrderEmail(orderDetails)}
                disabled={emailSending[orderDetails.id] || !orderDetails.customer.email || orderDetails.customer.email === 'Not provided'}
              >
                {emailSending[orderDetails.id] ? 'Sending...' : 'Send Order Email'}
              </button>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="order-details-right">
            <div className="status-management-visual">
              <h3>Order Status</h3>
              <div className="status-progress-bar">
                <div className={`status-step ${getStatusClass('pending')}`}>
                  <button 
                    className="status-label"
                    onClick={() => handleStatusUpdate(orderDetails.id, 'Pending')}
                    disabled={statusToLowerCase(orderDetails.status) === 'cancelled'}
                  >
                    <div className="status-indicator"></div>
                    Pending
                  </button>
                </div>
                
                <div className={`status-step ${getStatusClass('processing')}`}>
                  <button 
                    className="status-label"
                    onClick={() => handleStatusUpdate(orderDetails.id, 'Processing')}
                    disabled={statusToLowerCase(orderDetails.status) === 'cancelled'}
                  >
                    <div className="status-indicator"></div>
                    Processing
                  </button>
                </div>
                
                <div className={`status-step ${getStatusClass('shipped')}`}>
                  <button 
                    className="status-label"
                    onClick={() => handleStatusUpdate(orderDetails.id, 'Shipped')}
                    disabled={statusToLowerCase(orderDetails.status) === 'cancelled'}
                  >
                    <div className="status-indicator"></div>
                    Shipped
                  </button>
                </div>
                
                <div className={`status-step ${getStatusClass('completed')}`}>
                  <button 
                    className="status-label"
                    onClick={() => handleStatusUpdate(orderDetails.id, 'Completed')}
                    disabled={statusToLowerCase(orderDetails.status) === 'cancelled'}
                  >
                    <div className="status-indicator"></div>
                    Completed
                  </button>
                </div>
              </div>
              
              {/* Only show cancel button when not already cancelled */}
              {statusToLowerCase(orderDetails.status) !== 'cancelled' && (
                <button 
                  className="cancel-order-btn"
                  onClick={() => handleStatusUpdate(orderDetails.id, 'Cancelled')}
                >
                  Cancel Order
                </button>
              )}
            </div>

            {/* Payment Method Section */}
            <div className="payment-section">
              <h3>Payment Details</h3>
              <div className="payment-details">
                {isEditingPayment ? (
                  <div className="payment-edit-form">
                    <div className="form-group">
                      <label htmlFor="payment-method">Payment Method:</label>
                      <select 
                        id="payment-method"
                        value={paymentMethod} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="payment-select"
                      >
                        <option value="">Select payment method</option>
                        <option value="cash">Cash</option>
                        <option value="e-transfer">E-transfer</option>
                        <option value="prepaid">Prepaid (online)</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="payment-timing">Payment Timing:</label>
                      <select 
                        id="payment-timing"
                        value={paymentTiming} 
                        onChange={(e) => setPaymentTiming(e.target.value)}
                        className="payment-select"
                      >
                        <option value="">Select timing (optional)</option>
                        <option value="paid-in-advance">Paid in Advance</option>
                        <option value="paid-on-pickup">Paid on Pickup</option>
                        <option value="pending-payment">Pending Payment</option>
                      </select>
                    </div>
                    
                    <div className="payment-edit-actions">
                      <button 
                        className="save-payment-btn"
                        onClick={handleSavePayment}
                      >
                        Save
                      </button>
                      <button 
                        className="cancel-edit-btn"
                        onClick={() => setIsEditingPayment(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="payment-display">
                    <p>
                      <strong>Method:</strong> {formatPaymentMethod(orderDetails.payment?.method)}
                      {orderDetails.payment?.timing && (
                        <span className="payment-timing">
                          ({formatPaymentTiming(orderDetails.payment.timing)})
                        </span>
                      )}
                    </p>
                    {orderDetails.payment?.updatedAt && (
                      <p className="payment-updated">
                        Last updated: {new Date(orderDetails.payment.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                    <button 
                      className="edit-payment-btn"
                      onClick={() => setIsEditingPayment(true)}
                    >
                      Edit Payment Details
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Discount Section */}
            <div className="discount-section">
              <h3>Order Totals</h3>
              <div className="totals-breakdown">
                <div className="subtotal-row">
                  <span>Subtotal:</span>
                  <span>${formatCurrency(calculateSubtotal())}</span>
                </div>
                
                {/* Discount Row */}
                <div className="discount-row">
                  <span>Discount:</span>
                  <div className="discount-value">
                    {isEditingDiscount ? (
                      <div className="discount-edit-form">
                        <div className="discount-amount-input">
                          <span>$</span>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <input 
                          type="text"
                          className="discount-reason-input"
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          placeholder="Reason for discount (optional)"
                        />
                        <div className="discount-edit-actions">
                          <button 
                            className="save-discount-btn"
                            onClick={handleSaveDiscount}
                          >
                            Save
                          </button>
                          <button 
                            className="cancel-edit-btn"
                            onClick={() => setIsEditingDiscount(false)}
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="discount-preview">
                          <em>Preview: ${formatCurrency(calculateSubtotal())} - ${formatCurrency(getDiscountAmount())} = ${formatCurrency(getFinalTotal())}</em>
                        </div>
                      </div>
                    ) : (
                      <div className="discount-display">
                        <span>
                          {getDiscountAmount() > 0 ? 
                            `-$${formatCurrency(getDiscountAmount())}` : 
                            '$0.00'}
                        </span>
                        {orderDetails.discount?.reason && (
                          <span className="discount-reason">
                            ({orderDetails.discount.reason})
                          </span>
                        )}
                        <button 
                          className="edit-discount-btn"
                          onClick={() => setIsEditingDiscount(true)}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Final Total */}
                <div className="final-total-row">
                  <span>Total:</span>
                  <span>${formatCurrency(getFinalTotal())}</span>
                </div>
              </div>
            </div>
            
            <div className="invoice-actions">
              <h3>Invoice</h3>
              <button 
                className="generate-invoice-btn" 
                onClick={() => setShowInvoice(orderDetails.isFinalized ? 'final' : 'preliminary')}
              >
                View Invoice
              </button>
            </div>
            
            {/* Version info moved here from left column */}
            {orderDetails.versions && orderDetails.versions.length > 0 && (
              <div className="version-info">
                <h3>Order History</h3>
                <p>
                  {orderDetails.isFinalized 
                    ? 'This order has been finalized.' 
                    : 'This order can still be edited.'}
                </p>
                <p>
                  Version: {orderDetails.versions.length}
                  {orderDetails.lastModified && (
                    <span className="version-date">
                      {' '}(Last modified: {new Date(orderDetails.lastModified).toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && (
        <div className="invoice-modal">
          <div className="invoice-modal-content">
            <button className="close-invoice-btn" onClick={closeInvoice}>×</button>
            <Invoice 
              order={orderDetails} 
              type="print" 
              invoiceType={showInvoice} 
            />
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Confirm Order Cancellation</h3>
            <p>Are you sure you want to cancel this order? This will:</p>
            <ul>
              <li>Mark the order as cancelled</li>
              <li>Restore inventory for all items</li>
            </ul>
            <div className="confirmation-buttons">
              <button 
                className="confirm-btn"
                onClick={confirmCancelOrder}
              >
                Yes, Cancel Order
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowCancelConfirm(null);
                  setPendingStatusUpdate(null);
                }}
              >
                No, Keep Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Notification */}
      {pendingStatusUpdate && (
        <div className="status-update-notification">
          Updating order status...
        </div>
      )}
    </div>
  );
};

export default OrderDetails;



