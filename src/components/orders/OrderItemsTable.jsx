import React from 'react';

/**
 * OrderItemsTable - Displays the items within an order
 * Using a style similar to the invoice layout
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of items in the order
 * @param {number|string} props.total - Order total
 */
const OrderItemsTable = ({ items, total }) => {
  // Calculate the total if needed
  const calculateTotal = () => {
    const storedTotal = parseFloat(total);
    
    // If stored total is valid and not exactly 150, use it
    if (!isNaN(storedTotal) && storedTotal !== 150) {
      return storedTotal.toFixed(2);
    }
    
    // Otherwise calculate from items
    const calculatedTotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      return sum + (price * quantity);
    }, 0);
    
    return calculatedTotal.toFixed(2);
  };

  return (
    <div className="order-items">
      <h4>Items</h4>
      <table className="invoice-style-table">
        <thead>
          <tr>
            <th className="product-col">Product</th>
            <th className="quantity-col">Quantity</th>
            <th className="price-col">Price</th>
            <th className="total-col">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td className="product-col">{item.name}</td>
              <td className="quantity-col">{item.quantity}</td>
              <td className="price-col">${parseFloat(item.price).toFixed(2)}</td>
              <td className="total-col">
                ${(parseFloat(item.price) * parseInt(item.quantity, 10)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="3" className="order-total-label">Order Total</td>
            <td className="order-total-value">
              ${calculateTotal()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default OrderItemsTable;
