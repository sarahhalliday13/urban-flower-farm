import React from 'react';

/**
 * CustomerInfoCell - Displays customer name and email
 * @param {Object} props - Component props
 * @param {Object} props.customer - Customer information with name and email
 */
const CustomerInfoCell = ({ customer }) => {
  // Ensure customer data is available or provide default values
  const customerName = customer?.name || 
    `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 
    'No name provided';
  
  const customerEmail = customer?.email || 'No email';

  return (
    <td data-label="Customer">
      <span className="customer-name">{customerName}</span>
      <span className="customer-email">{customerEmail}</span>
    </td>
  );
};

export default CustomerInfoCell;
