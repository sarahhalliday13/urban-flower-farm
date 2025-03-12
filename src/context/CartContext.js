import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

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
    // Ensure quantity is a number
    const quantityNum = parseInt(quantity, 10) || 1;
    
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      
      // Check inventory limits
      const currentStock = parseInt(product.inventory?.currentStock, 10) || 0;
      const maxOrderQuantity = parseInt(product.inventory?.maxOrderQuantity, 10) || 999;
      
      if (existingItem) {
        // Ensure existing quantity is a number
        const existingQuantity = parseInt(existingItem.quantity, 10) || 0;
        
        // Calculate new quantity respecting inventory limits
        const newQuantity = Math.min(
          existingQuantity + quantityNum,
          currentStock,
          maxOrderQuantity
        );
        
        // If we can't add more due to inventory limits, return the current state
        if (newQuantity <= existingQuantity) {
          return prevItems;
        }
        
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      }
      
      // For new items, respect inventory limits
      const newQuantity = Math.min(quantityNum, currentStock, maxOrderQuantity);
      
      // Only add if we can add at least 1
      if (newQuantity <= 0) {
        return prevItems;
      }
      
      return [...prevItems, { ...product, quantity: newQuantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    // Ensure quantity is a number
    const quantityNum = parseInt(quantity, 10) || 0;
    
    setCartItems(prevItems => {
      // Find the product in the cart
      const item = prevItems.find(item => item.id === productId);
      if (!item) return prevItems;
      
      // Check inventory limits
      const currentStock = parseInt(item.inventory?.currentStock, 10) || 0;
      const maxOrderQuantity = parseInt(item.inventory?.maxOrderQuantity, 10) || 999;
      
      // Calculate new quantity respecting inventory limits
      const newQuantity = Math.min(
        Math.max(0, quantityNum), // Ensure non-negative
        currentStock,
        maxOrderQuantity
      );
      
      // If quantity is 0, remove the item
      if (newQuantity <= 0) {
        return prevItems.filter(item => item.id !== productId);
      }
      
      // Update the quantity
      return prevItems.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      );
    });
  };

  // Add clearCart function to empty the cart
  const clearCart = () => {
    setCartItems([]);
  };

  const getTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      return total + (price * quantity);
    }, 0);
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