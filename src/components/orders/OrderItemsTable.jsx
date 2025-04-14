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
      
      setCalculatedTotal(Math.round(newTotal));
    } catch (error) {
      console.error("Error calculating total:", error);
      setCalculatedTotal('0');
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
                ${Math.round(parseFloat(item.price))}
              </td>
              <td className="total-col">
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  ${Math.round(parseFloat(item.price) * parseInt(item.quantity, 10))}
                </div>
                {editable && (
                  <div style={{ marginTop: '8px', clear: 'both' }}>
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
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="3" className="order-total-label">Order Total</td>
            <td className="order-total-value">
              ${calculatedTotal}
            </td>
          </tr>
        </tfoot>
      </table>

      <style jsx>{`
        .total-col, .order-total-value {
          border: none !important;
        }

        .quantity-input {
          width: 60px;
          height: 44px;
          padding: 8px;
          font-size: 16px;
          border-radius: 4px;
          border: 1px solid #ccc;
          text-align: center;
        }
        
        .remove-item-link {
          text-align: right;
          width: 100%;
          display: block;
          margin-top: 5px;
        }

        @media (max-width: 768px) {
          .quantity-input {
            width: 70px;
            height: 48px;
            font-size: 18px;
            padding: 8px 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderItemsTable;
