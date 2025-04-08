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
  
  const toggleOrderDetails = () => {
    setActiveOrder(activeOrder === order.id ? null : order.id);
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
          ${typeof order.total === 'number' 
            ? order.total.toFixed(2) 
            : parseFloat(order.total || 0).toFixed(2)}
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
