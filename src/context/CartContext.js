import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

// Tax rates for Canadian sales
const GST_RATE = 0.05; // 5%
const PST_RATE = 0.07; // 7%

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    // Load cart items from localStorage on initialization
    const savedCartItems = localStorage.getItem('cartItems');
    return savedCartItems ? JSON.parse(savedCartItems) : [];
  });

  // Save cart items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    // Ensure quantity is a number and at least 1
    let quantityToAdd = Math.max(parseInt(quantity, 10) || 1, 1);
    
    // Get available stock from product.inventory
    const availableStock = parseInt(product.inventory?.currentStock, 10) || 0;
    
    // If no stock available, return false
    if (availableStock <= 0) {
      // Notify user that item is out of stock
      const event = new CustomEvent('show-toast', {
        detail: {
          message: `Sorry, ${product.name} is out of stock.`,
          type: 'error',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
      return false;
    }
    
    // Check how many are already in the cart
    const existingItem = cartItems.find(item => item.id === product.id);
    const currentInCart = existingItem ? parseInt(existingItem.quantity, 10) || 0 : 0;
    
    // Calculate how many more can be added
    const maxAddable = Math.max(0, availableStock - currentInCart);
    
    // If we can't add any more, show message
    if (maxAddable <= 0) {
      const event = new CustomEvent('show-toast', {
        detail: {
          message: `You already have all available ${product.name} in your cart.`,
          type: 'warning',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
      return false;
    }
    
    // Limit quantity to what's available
    if (quantityToAdd > maxAddable) {
      const event = new CustomEvent('show-toast', {
        detail: {
          message: `Only ${maxAddable} more ${product.name} available. Added what we could.`,
          type: 'warning',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
      quantityToAdd = maxAddable;
    }
    
    // Now add to cart with the adjusted quantity
    setCartItems(prevItems => {
      // Check if item already exists in cart
      const existingItemIndex = prevItems.findIndex(item => item.id === product.id);
      
      // Make a copy of the current cart
      const updatedItems = [...prevItems];
      
      if (existingItemIndex >= 0) {
        // Item exists, update its quantity
        const currentQuantity = updatedItems[existingItemIndex].quantity || 0;
        const newQuantity = currentQuantity + quantityToAdd;
        
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: newQuantity
        };
      } else {
        // Item doesn't exist, add it with the specified quantity
        updatedItems.push({
          ...product,
          quantity: quantityToAdd
        });
      }
      
      return updatedItems;
    });
    
    // Return true if any quantity was added, false otherwise
    return quantityToAdd > 0;
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    // Ensure quantity is a number
    const quantityNum = parseInt(quantity, 10) || 0;
    
    setCartItems(prevItems => {
      // If quantity is 0 or less, remove the item
      if (quantityNum <= 0) {
        return prevItems.filter(item => item.id !== productId);
      }
      
      // Find the product to update
      const productToUpdate = prevItems.find(item => item.id === productId);
      if (!productToUpdate) return prevItems;
      
      // Check available stock
      const availableStock = parseInt(productToUpdate.inventory?.currentStock, 10) || 0;
      
      // Limit quantity to available stock
      const newQuantity = Math.min(quantityNum, availableStock);
      
      // Show message if quantity was limited
      if (newQuantity < quantityNum) {
        const event = new CustomEvent('show-toast', {
          detail: {
            message: `Can only set quantity to ${newQuantity} (available stock).`,
            type: 'warning',
            duration: 3000
          }
        });
        window.dispatchEvent(event);
      }
      
      // Update the quantity
      return prevItems.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      );
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getSubtotal = () => {
    // Calculate subtotal (before taxes)
    let subtotal = 0;

    for (const item of cartItems) {
      const price = parseFloat(item.price);
      const quantity = parseInt(item.quantity, 10);

      // Skip invalid items
      if (isNaN(price) || isNaN(quantity)) {
        console.warn('Invalid item in cart:', item);
        continue;
      }

      subtotal += price * quantity;
    }

    return subtotal;
  };

  const getGST = (subtotal = null) => {
    // Calculate GST (5%)
    const sub = subtotal !== null ? subtotal : getSubtotal();
    return sub * GST_RATE;
  };

  const getPST = (subtotal = null) => {
    // Calculate PST (7%)
    const sub = subtotal !== null ? subtotal : getSubtotal();
    return sub * PST_RATE;
  };

  const getTaxes = () => {
    // Get all tax amounts in one call
    const subtotal = getSubtotal();
    const gst = getGST(subtotal);
    const pst = getPST(subtotal);

    return {
      subtotal,
      gst,
      pst,
      totalTax: gst + pst,
      total: subtotal + gst + pst
    };
  };

  const getTotal = () => {
    // Total including taxes
    const subtotal = getSubtotal();
    const gst = getGST(subtotal);
    const pst = getPST(subtotal);

    return subtotal + gst + pst;
  };

  const getItemCount = () => {
    return cartItems.reduce((total, item) => {
      // Ensure we're working with numbers
      const quantity = parseInt(item.quantity, 10) || 0;
      return total + quantity;
    }, 0);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getSubtotal,
      getGST,
      getPST,
      getTaxes,
      getTotal,
      getItemCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
} 