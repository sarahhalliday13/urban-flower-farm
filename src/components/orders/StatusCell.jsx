import React from 'react';
import { useOrders } from './OrderContext';

/**
 * StatusCell - Displays order status with appropriate styling
 * @param {Object} props - Component props
 * @param {string|Object} props.status - The order status (string or object with label)
 */
const StatusCell = ({ status }) => {
  const { getStatusClass } = useOrders();

  // Handle status that might be an object (with a label property)
  let orderStatus = 'Pending';
  if (status) {
    if (typeof status === 'object' && status.label) {
      orderStatus = status.label; // Use the label if it's an object with a label property
    } else if (typeof status === 'string') {
      orderStatus = status; // Use directly if it's a string
    } else {
      orderStatus = String(status); // Convert to string as a fallback
    }
  }
  
  const statusClass = getStatusClass(orderStatus);

  return (
    <td data-label="Status">
      <span className={`order-status ${statusClass}`}>
        {orderStatus}
      </span>
    </td>
  );
};

export default StatusCell;
