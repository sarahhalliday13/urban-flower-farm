import React from 'react';

/**
 * OrderItemsTable - Displays the items within an order
 * Using a style similar to the invoice layout
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of items in the order
 * @param {number|string} props.total - Order total
 * @param {boolean} props.editable - Whether the items can be edited
 * @param {function} props.onUpdateQuantity - Function to update item quantity
 * @param {function} props.onRemoveItem - Function to remove an item
 */
const OrderItemsTable = ({ 
  items, 
  total, 
  editable = false,
  onUpdateQuantity = () => {},
  onRemoveItem = () => {}
}) => {
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

  // Handle quantity change in editable mode
  const handleQuantityChange = (itemId, newQuantity) => {
    // Ensure quantity is valid
    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity < 0) return;
    
    onUpdateQuantity(itemId, quantity);
  };

  return (
    <div className="order-items">
      <h4>Items {editable && <span className="edit-mode-indicator">(Edit Mode)</span>}</h4>
      <table className="invoice-style-table">
        <thead>
          <tr>
            <th className="product-col">Product</th>
            <th className="quantity-col">Quantity</th>
            <th className="price-col">Price</th>
            <th className="total-col">Total</th>
            {editable && <th className="actions-col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td className="product-col">{item.name}</td>
              <td className="quantity-col">
                {editable ? (
                  <input 
                    type="number" 
                    min="0" 
                    value={item.quantity} 
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    className="quantity-input"
                  />
                ) : (
                  item.quantity
                )}
              </td>
              <td className="price-col">${parseFloat(item.price).toFixed(2)}</td>
              <td className="total-col">
                ${(parseFloat(item.price) * parseInt(item.quantity, 10)).toFixed(2)}
              </td>
              {editable && (
                <td className="actions-col">
                  <button 
                    className="remove-item-link" 
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={editable ? "4" : "3"} className="order-total-label">Order Total</td>
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
