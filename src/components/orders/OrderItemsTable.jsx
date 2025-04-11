import React, { useEffect, useState } from 'react';

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
  items = [], 
  total = '0.00', 
  editable = false,
  onUpdateQuantity = () => console.log('Update quantity not implemented'),
  onRemoveItem = () => console.log('Remove item not implemented')
}) => {
  // Keep local state of the calculated total to ensure UI updates
  const [calculatedTotal, setCalculatedTotal] = useState('0.00');
  
  // Recalculate total whenever items change
  useEffect(() => {
    try {
      console.log("Items in OrderItemsTable:", items);
      const newTotal = items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        return sum + (price * quantity);
      }, 0);
      
      setCalculatedTotal(newTotal.toFixed(2));
    } catch (error) {
      console.error("Error calculating total:", error);
      setCalculatedTotal('0.00');
    }
  }, [items]);

  // Handle quantity change in editable mode
  const handleQuantityChange = (itemId, newQuantity) => {
    try {
      // Ensure quantity is valid
      const quantity = parseInt(newQuantity, 10);
      if (isNaN(quantity) || quantity < 0) return;
      
      console.log(`Updating quantity for item ${itemId} to ${quantity}`);
      onUpdateQuantity(itemId, quantity);
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  return (
    <div className="order-items">
      <table className="invoice-style-table">
        <thead>
          <tr>
            <th className="product-col">Product</th>
            <th className="quantity-col">Quantity</th>
            <th className="price-col">Price</th>
            <th className="total-col">Total</th>
            {editable && (
              <th className="actions-col">Actions</th>
            )}
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
              <td className="price-col">
                ${parseFloat(item.price).toFixed(2)}
              </td>
              <td className="total-col">
                ${(parseFloat(item.price) * parseInt(item.quantity, 10)).toFixed(2)}
              </td>
              {editable && (
                <td className="actions-col">
                  <button 
                    className="remove-item-link" 
                    onClick={() => {
                      try {
                        console.log(`Removing item ${item.id}`);
                        onRemoveItem(item.id);
                      } catch (error) {
                        console.error("Error removing item:", error);
                      }
                    }}
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
              ${calculatedTotal}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default OrderItemsTable;
