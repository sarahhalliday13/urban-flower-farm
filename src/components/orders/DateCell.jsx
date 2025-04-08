import React from 'react';
import { useOrders } from './OrderContext';

/**
 * DateCell - Displays a formatted date
 * @param {Object} props - Component props
 * @param {string} props.date - The date string to format
 */
const DateCell = ({ date }) => {
  const { formatDate } = useOrders();
  
  return (
    <td data-label="Date">
      <span className="order-date">{date ? formatDate(date) : 'Unknown'}</span>
    </td>
  );
};

export default DateCell;
