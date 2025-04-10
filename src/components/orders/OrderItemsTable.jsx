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
 * @param {function} props.onToggleFreebie - Function to toggle item freebie status
 */
const OrderItemsTable = ({ 
  items, 
  total, 
  editable = false,
  onUpdateQuantity = () => {},
  onRemoveItem = () => {},
  onToggleFreebie = () => {}
}) => {
  // Keep local state of the calculated total to ensure UI updates
  const [calculatedTotal, setCalculatedTotal] = useState('0.00');
  
  // Recalculate total whenever items change
  useEffect(() => {
    const newTotal = items.reduce((sum, item) => {
      if (item.isFreebie) return sum;
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      return sum + (price * quantity);
    }, 0);
    
    setCalculatedTotal(newTotal.toFixed(2));
  }, [items]);

  // Handle quantity change in editable mode
  const handleQuantityChange = (itemId, newQuantity) => {
    // Ensure quantity is valid
    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity < 0) return;
    
    onUpdateQuantity(itemId, quantity);
  };

  // Handle freebie toggle in editable mode
  const handleFreebieToggle = (itemId, isFreebie) => {
    onToggleFreebie(itemId, isFreebie);
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
              <>
                <th className="freebie-col">Freebie</th>
                <th className="actions-col">Actions</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className={item.isFreebie ? 'freebie-item' : ''}>
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
                {item.isFreebie ? (
                  <span className="freebie-price">$0.00</span>
                ) : (
                  `$${parseFloat(item.price).toFixed(2)}`
                )}
              </td>
              <td className="total-col">
                {item.isFreebie ? (
                  <span className="freebie-total">$0.00</span>
                ) : (
                  `$${(parseFloat(item.price) * parseInt(item.quantity, 10)).toFixed(2)}`
                )}
              </td>
              {editable && (
                <>
                  <td className="freebie-col">
                    <label className="freebie-toggle">
                      <input
                        type="checkbox"
                        checked={!!item.isFreebie}
                        onChange={(e) => handleFreebieToggle(item.id, e.target.checked)}
                        className="freebie-checkbox"
                      />
                      <span className="freebie-label">Freebie</span>
                    </label>
                  </td>
                  <td className="actions-col">
                    <button 
                      className="remove-item-link" 
                      onClick={() => onRemoveItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      Delete
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={editable ? "5" : "3"} className="order-total-label">Order Total</td>
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
