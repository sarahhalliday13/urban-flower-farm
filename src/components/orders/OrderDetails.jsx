import React, { useState, useEffect, useRef } from 'react';
import { useOrders } from './OrderContext';
import OrderItemsTable from './OrderItemsTable';
import Invoice from '../Invoice';
import OrderEditor from './OrderEditor';
import { useNavigate } from 'react-router-dom';

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
    finalizeOrder,
    refreshOrders, // Added refreshOrders to the context
    addToast // Added addToast to the context
  } = useOrders();
  
  const navigate = useNavigate();
  
  // State for discount editing
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountApplyTo, setDiscountApplyTo] = useState('all'); // 'all', 'instock', 'preorder', 'split'
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  
  // State for payment method editing
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentTiming, setPaymentTiming] = useState('');
  const [isEditingPayment, setIsEditingPayment] = useState(false);

  // State for invoice payment tracking
  const [instockPaid, setInstockPaid] = useState(false);
  const [preorderPaid, setPreorderPaid] = useState(false);
  const [allItemsPaid, setAllItemsPaid] = useState(false);
  
  // State for order editing
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  // Track if we need to reopen the modal after refresh
  const [shouldReopenAfterRefresh, setShouldReopenAfterRefresh] = useState(false);
  // Counter to force remount of OrderEditor
  const [editorKey, setEditorKey] = useState(0);
  // Reference for scrolling
  const orderDetailsRef = useRef(null);

  // Find the active order details
  const orderDetails = activeOrder ? orders.find(order => order.id === activeOrder) : null;

  // Initialize the discount states from order if available
  useEffect(() => {
    if (orderDetails?.discount) {
      setDiscountAmount(orderDetails.discount.amount || '');
      setDiscountReason(orderDetails.discount.reason || '');
      setDiscountApplyTo(orderDetails.discount.applyTo || 'all');
    } else {
      setDiscountAmount('');
      setDiscountReason('');
      setDiscountApplyTo('all');
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

    // Initialize invoice payment status
    if (orderDetails?.invoicePayments) {
      setInstockPaid(orderDetails.invoicePayments.instock || false);
      setPreorderPaid(orderDetails.invoicePayments.preorder || false);
      setAllItemsPaid(orderDetails.invoicePayments.all || false);
    } else {
      setInstockPaid(false);
      setPreorderPaid(false);
      setAllItemsPaid(false);
    }

    // Reset editing state when changing orders
    setIsEditingOrder(false);
  }, [orderDetails?.id, orderDetails?.discount, orderDetails?.payment, orderDetails?.invoicePayments]);
  
  // Scroll to order details when opened or reopened
  useEffect(() => {
    if (orderDetailsRef.current && activeOrder) {
      // Get the header height for offset
      const headerHeight = 165; // Height of the fixed header
      const elementTop = orderDetailsRef.current.getBoundingClientRect().top;
      const offsetPosition = elementTop + window.pageYOffset - headerHeight;

      // Scroll with smooth behavior
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, [activeOrder, isEditingOrder]);

  // Handle closing the edit modal with refresh
  const closeModalWithRefresh = async () => {
    // First close the modal immediately to avoid UI glitches
    setIsEditingOrder(false);
    setShouldReopenAfterRefresh(true);
    
    // Wait a bit for the modal to close
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Then refresh orders
    try {
      await refreshOrders(true);
      console.log("Orders refreshed after edit");
      
      // After refresh, reopen if needed
      if (shouldReopenAfterRefresh) {
        setIsEditingOrder(true);
        setShouldReopenAfterRefresh(false);
        
        // Get the header height for offset
        const headerHeight = 165; // Height of the fixed header
        const elementTop = orderDetailsRef.current?.getBoundingClientRect().top;
        if (elementTop !== undefined) {
          const offsetPosition = elementTop + window.pageYOffset - headerHeight;
          
          // Scroll with smooth behavior
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    } catch (error) {
      console.error("Error refreshing orders:", error);
      addToast("Failed to refresh orders", "error");
    }
  };
  
  // If no active order, don't render anything
  if (!activeOrder) return null;
  
  // If order details not found, don't render anything
  if (!orderDetails) return null;
  
  const viewInvoice = () => {
    navigate(`/invoice/${orderDetails.id}`);
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
      type: 'amount', // Currently we only support fixed amount discounts
      applyTo: discountApplyTo // Where to apply the discount
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

  // Handle toggling invoice payment status
  const handleToggleInvoicePayment = async (invoiceType, currentValue) => {
    const newValue = !currentValue;

    // Update local state immediately
    if (invoiceType === 'instock') {
      setInstockPaid(newValue);
    } else if (invoiceType === 'preorder') {
      setPreorderPaid(newValue);
    } else if (invoiceType === 'all') {
      setAllItemsPaid(newValue);
    }

    // Update Firebase
    try {
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/orders/${orderDetails.id}/invoicePayments.json`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            [invoiceType]: newValue
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      // Refresh orders to sync state
      if (refreshOrders) {
        await refreshOrders();
      }
    } catch (error) {
      console.error('Error updating invoice payment status:', error);
      // Revert local state on error
      if (invoiceType === 'instock') {
        setInstockPaid(currentValue);
      } else if (invoiceType === 'preorder') {
        setPreorderPaid(currentValue);
      } else if (invoiceType === 'all') {
        setAllItemsPaid(currentValue);
      }
    }
  };

  // Calculate subtotal from items
  const calculateSubtotal = () => {
    if (!Array.isArray(orderDetails.items)) return 0;

    return orderDetails.items.reduce((sum, item) => {
      // Skip freebies from subtotal calculation
      if (item.isFreebie) return sum;

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

  // Get final total including taxes after discount
  const getFinalTotal = () => {
    const subtotal = orderDetails.subtotal || calculateSubtotal();
    const discount = getDiscountAmount();
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);
    // Always recalculate taxes based on subtotal after discount
    const gst = subtotalAfterDiscount * 0.05;
    const pst = subtotalAfterDiscount * 0.07;
    return subtotalAfterDiscount + gst + pst;
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
    <div className="order-details-container" ref={orderDetailsRef}>
      <button className="close-details-btn" onClick={() => setActiveOrder(null)}>×</button>
      
      {isEditingOrder ? (
        <OrderEditor 
          orderId={activeOrder} 
          closeModal={closeModalWithRefresh} 
          key={editorKey}
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

            {/* Order Totals Section */}
            <div className="discount-section" style={{marginBottom: '15px'}}>
              <h3 style={{marginBottom: '10px'}}>Order Totals</h3>
              <div className="totals-breakdown" style={{padding: '5px 0'}}>
                {/* Standard Invoice Display */}
                <div className="subtotal-row" style={{padding: '1px 0', margin: '1px 0'}}>
                  <span>Sub-total:</span>
                  <span>${formatCurrency(orderDetails.subtotal || calculateSubtotal())}</span>
                </div>

                {/* Discount Row */}
                <div className="discount-row" style={{padding: '1px 0', margin: '1px 0'}}>
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
                        <select
                          className="discount-apply-to-select"
                          value={discountApplyTo}
                          onChange={(e) => setDiscountApplyTo(e.target.value)}
                          style={{width: '100%', padding: '8px', marginTop: '8px', marginBottom: '8px'}}
                        >
                          <option value="all">Apply to All Items</option>
                          <option value="instock">Apply to In Stock Only</option>
                          <option value="preorder">Apply to Pre-Order Only</option>
                          <option value="split">Split Proportionally</option>
                        </select>
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
                          <em>Preview: ${formatCurrency(calculateSubtotal())} + taxes - ${formatCurrency(getDiscountAmount())} = ${formatCurrency(getFinalTotal())}</em>
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

                {/* Tax rows - calculated on subtotal after discount */}
                <div className="tax-row" style={{padding: '1px 0', margin: '1px 0'}}>
                  <span>GST (5%):</span>
                  <span>${formatCurrency(Math.max(0, (orderDetails.subtotal || calculateSubtotal()) - getDiscountAmount()) * 0.05)}</span>
                </div>

                <div className="tax-row" style={{padding: '1px 0', margin: '1px 0'}}>
                  <span>PST (7%):</span>
                  <span>${formatCurrency(Math.max(0, (orderDetails.subtotal || calculateSubtotal()) - getDiscountAmount()) * 0.07)}</span>
                </div>

                {/* Final Total */}
                <div className="final-total-row" style={{padding: '1px 0', margin: '1px 0'}}>
                  <span>Total:</span>
                  <span>${formatCurrency(getFinalTotal())}</span>
                </div>
              </div>
            </div>

            {/* Customer Note Section - Visible to customer */}
            {orderDetails.customerNote && (
              <div className="customer-note-display" style={{
                backgroundColor: '#fff3cd',
                border: '2px solid #ffc107',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px'
              }}>
                <h3 style={{color: '#856404', marginTop: 0, marginBottom: '10px'}}>Note About Your Order</h3>
                <div style={{
                  backgroundColor: 'white',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#333'
                }}>
                  {orderDetails.customerNote}
                </div>
              </div>
            )}

            {/* Admin Notes Section */}
            {orderDetails.adminNotes && orderDetails.adminNotes.length > 0 && (
              <div className="admin-notes-display">
                <h3>Admin Notes</h3>
                <div className="admin-notes-list">
                  {orderDetails.adminNotes.map((note, index) => (
                    <div key={index} className="admin-note-item">
                      <div className="note-header">
                        <span className="note-date">{new Date(note.timestamp).toLocaleString()}</span>
                        {note.addedBy && <span className="note-author"> - {note.addedBy}</span>}
                      </div>
                      <div className="note-content">{note.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
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

            <div className="invoice-actions" style={{marginTop: '15px'}}>
              <h3 style={{marginBottom: '12px'}}>Invoice & Payment Status</h3>

              <div className="invoice-buttons-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <button
                    className="generate-invoice-btn invoice-instock-btn"
                    onClick={() => navigate(`/invoice/${orderDetails.id}?type=instock`)}
                  >
                    In Stock Items
                  </button>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer'}}>
                    <input
                      type="checkbox"
                      checked={instockPaid}
                      onChange={() => handleToggleInvoicePayment('instock', instockPaid)}
                      style={{cursor: 'pointer'}}
                    />
                    <span style={{color: instockPaid ? '#28a745' : '#666'}}>
                      {instockPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </label>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <button
                    className="generate-invoice-btn invoice-preorder-btn"
                    onClick={() => navigate(`/invoice/${orderDetails.id}?type=preorder`)}
                  >
                    Pre-Order Items
                  </button>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer'}}>
                    <input
                      type="checkbox"
                      checked={preorderPaid}
                      onChange={() => handleToggleInvoicePayment('preorder', preorderPaid)}
                      style={{cursor: 'pointer'}}
                    />
                    <span style={{color: preorderPaid ? '#28a745' : '#666'}}>
                      {preorderPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </label>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <button
                    className="generate-invoice-btn invoice-all-btn"
                    onClick={() => navigate(`/invoice/${orderDetails.id}?type=all`)}
                  >
                    All Items
                  </button>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer'}}>
                    <input
                      type="checkbox"
                      checked={allItemsPaid}
                      onChange={() => handleToggleInvoicePayment('all', allItemsPaid)}
                      style={{cursor: 'pointer'}}
                    />
                    <span style={{color: allItemsPaid ? '#28a745' : '#666'}}>
                      {allItemsPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </label>
                </div>
              </div>
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



