import React from 'react';
import { useOrders } from './OrderContext';
import OrderTableHeader from './OrderTableHeader';
import OrderTableRow from './OrderTableRow';
import OrderDetails from './OrderDetails';

/**
 * OrderTable - Renders the table of orders
 * Handles the loading state and empty states
 */
const OrderTable = () => {
  const { loading, filteredOrders, activeOrder } = useOrders();

  // Loading state
  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  // No orders found
  if (filteredOrders.length === 0) {
    return <div className="no-orders">No orders found</div>;
  }

  return (
    <div className="orders-list">
      <table className="orders-table">
        <OrderTableHeader />
        <tbody>
          {filteredOrders.map(order => (
            <React.Fragment key={order.id}>
              <OrderTableRow order={order} />
              {activeOrder === order.id && (
                <tr className="details-row">
                  <td colSpan="6">
                    <OrderDetails />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
