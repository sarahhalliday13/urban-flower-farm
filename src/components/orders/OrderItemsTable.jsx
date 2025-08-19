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
  onRemoveItem = () => console.log('Remove item not implemented'),
  onToggleFreebie = () => console.log('Toggle freebie not implemented')
}) => {
  // Keep local state of the calculated total to ensure UI updates
  const [calculatedTotal, setCalculatedTotal] = useState('0.00');
  
  // Recalculate total whenever items change
  useEffect(() => {
    try {
      console.log("Items in OrderItemsTable:", items);
      const newTotal = items.reduce((sum, item) => {
        // Skip freebies from total calculation
        if (item.isFreebie) return sum;
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
            {editable && <th className="freebie-col">Freebie</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td className="product-col">
                {item.name}
                {editable && (
                  <div style={{ marginTop: '8px' }}>
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
              <td className="quantity-col">
                {editable ? (
                  <div className="quantity-control-wrapper">
                    <button 
                      className="quantity-btn decrease-btn"
                      onClick={() => handleQuantityChange(item.id, Math.max(0, parseInt(item.quantity, 10) - 1))}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      min="0" 
                      value={item.quantity} 
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      className="quantity-input"
                    />
                    <button 
                      className="quantity-btn increase-btn"
                      onClick={() => handleQuantityChange(item.id, parseInt(item.quantity, 10) + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  item.quantity
                )}
              </td>
              <td className="price-col">
                {item.isFreebie ? (
                  <span style={{ textDecoration: 'line-through', color: '#999' }}>
                    ${Math.round(parseFloat(item.price))}
                  </span>
                ) : (
                  `$${Math.round(parseFloat(item.price))}`
                )}
              </td>
              <td className="total-col">
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {item.isFreebie ? (
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>FREE</span>
                  ) : (
                    `$${Math.round(parseFloat(item.price) * parseInt(item.quantity, 10))}`
                  )}
                </div>
              </td>
              {editable && (
                <td className="freebie-col">
                  <input
                    type="checkbox"
                    checked={item.isFreebie || false}
                    onChange={(e) => {
                      console.log(`Toggling freebie for item ${item.id}`);
                      onToggleFreebie(item.id, e.target.checked);
                    }}
                    className="freebie-checkbox"
                  />
                </td>
              )}
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
        .order-total-value {
          /* Remove border: none to show the border */
        }
        
        .invoice-style-table {
          border-collapse: collapse;
          border: none;
          box-shadow: none;
        }
        
        .invoice-style-table th,
        .invoice-style-table td {
          border: none;
          box-shadow: none;
          border-bottom: none;
        }
        
        .invoice-style-table th {
          padding: 10px 5px;
          text-align: left;
        }
        
        .invoice-style-table th.price-col,
        .invoice-style-table th.total-col {
          text-align: right;
        }
        
        .product-col {
          text-align: left;
          width: 45%;
          padding: 5px;
        }
        
        .invoice-style-table tr {
          border: none;
          box-shadow: none;
          background: transparent;
        }

        .quantity-col {
          width: 120px;
        }
        
        .price-col {
          width: 50px;
          text-align: right;
          padding-right: 20px;
        }
        
        .total-col {
          width: 70px;
          text-align: right;
        }

        .freebie-col {
          width: 60px;
          text-align: center;
        }

        .freebie-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .quantity-input {
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          min-height: 40px !important;
          max-width: 40px !important;
          max-height: 40px !important;
          padding: 0 !important;
          margin: 0 !important;
          font-size: 16px;
          border-radius: 4px;
          border: 1px solid #ccc;
          text-align: center;
          box-sizing: border-box !important;
          -webkit-appearance: none;
          appearance: none;
        }
        
        .quantity-input::-webkit-inner-spin-button, 
        .quantity-input::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        
        .quantity-input[type=number] {
          -moz-appearance: textfield;
        }
        
        .quantity-control-wrapper {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        
        .quantity-btn {
          width: 30px;
          height: 40px;
          border-radius: 4px;
          background-color: #2c5530;
          color: white;
          border: none;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 2px;
        }
        
        .quantity-btn:hover {
          background-color: #1e3c21;
        }
        
        .remove-item-link {
          text-align: left;
          width: 100%;
          display: block;
          margin-top: 5px;
          color: #d32f2f;
        }

        @media (max-width: 768px) {
          .quantity-input {
            width: 40px !important;
            height: 40px !important;
            padding: 0 !important;
          }
        }

        .order-total-label {
          text-align: right;
          padding-right: 20px;
        }
      `}</style>
    </div>
  );
};

export default OrderItemsTable;
