import React from 'react';
import { useOrders } from './OrderContext';
import CustomerInfoCell from './CustomerInfoCell';
import DateCell from './DateCell';
import StatusCell from './StatusCell';

/**
 * OrderTableRow - Renders a single row in the orders table
 * @param {Object} props - Component props
 * @param {Object} props.order - The order object to display
 */
const OrderTableRow = ({ order }) => {
  const { activeOrder, setActiveOrder, statusToLowerCase } = useOrders();
  
  // Calculate final total with discount
  const getFinalTotal = () => {
    // Always calculate from items to account for freebies
    const items = Array.isArray(order.items) ? order.items : [];

    // Get the subtotal from items, excluding freebies
    const subtotal = items.reduce((sum, item) => {
      // Skip freebies from calculation
      if (item.isFreebie) return sum;

      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      return sum + (price * quantity);
    }, 0);

    // Calculate taxes
    const gst = order.gst || (subtotal * 0.05);
    const pst = order.pst || (subtotal * 0.07);

    // Apply discount if any
    const discount = parseFloat(order.discount?.amount || 0);
    const total = Math.max(0, subtotal + gst + pst - discount); // Ensure total doesn't go negative

    return total.toFixed(2);
  };

  const toggleOrderDetails = () => {
    setActiveOrder(activeOrder === order.id ? null : order.id);
    
    // If we're opening the details, wait a bit for them to render then scroll
    if (activeOrder !== order.id) {
      setTimeout(() => {
        // Find the order details container and scroll to it
        const orderDetailsElement = document.querySelector('.order-details-container');
        if (orderDetailsElement) {
          const yOffset = -165; // Increased to -165px to show order header row
          const y = orderDetailsElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
          
          window.scrollTo({
            top: y,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  // Get readable status string
  const getDisplayStatus = (status) => {
    if (!status) return 'Pending';
    if (typeof status === 'object' && status.label) return status.label;
    if (typeof status === 'string') return status;
    return 'Pending';
  };

  return (
    <tr onClick={toggleOrderDetails}>
      <td data-label="Order" className="order-id-cell">
        <span className="order-id">#{order.id || 'Unknown'}</span>
      </td>
      <DateCell date={order.date} />
      <CustomerInfoCell customer={order.customer} />
      <StatusCell status={getDisplayStatus(order.status)} />
      <td data-label="Total">
        <span className="order-total">
          ${getFinalTotal()}
        </span>
      </td>
      <td data-label="Actions">
        <button 
          className="view-details-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleOrderDetails();
          }}
        >
          View Details
        </button>
      </td>
    </tr>
  );
};

export default OrderTableRow;
