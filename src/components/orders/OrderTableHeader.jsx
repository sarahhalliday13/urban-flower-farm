import React from 'react';

/**
 * OrderTableHeader - Renders the header row for the orders table
 */
const OrderTableHeader = () => {
  return (
    <thead>
      <tr>
        <th>Order</th>
        <th>Date</th>
        <th>Customer</th>
        <th>Status</th>
        <th>Total</th>
        <th>Actions</th>
      </tr>
    </thead>
  );
};

export default OrderTableHeader;
