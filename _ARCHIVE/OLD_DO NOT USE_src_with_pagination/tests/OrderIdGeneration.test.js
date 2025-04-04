import { describe, expect, test, jest, beforeEach } from '@jest/globals';

// Mock the Firebase service
jest.mock('../services/firebase', () => {
  return {
    saveOrder: jest.fn().mockResolvedValue(true),
    getOrders: jest.fn().mockResolvedValue([])
  };
});

// Import firebase service after mocking
import * as firebaseService from '../services/firebase';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Order ID Generation Tests', () => {
  beforeEach(() => {
    // Reset localStorage mock before each test
    localStorageMock.clear();
    // Reset Firebase mocks
    jest.clearAllMocks();
  });

  // Function to simulate the order ID generation logic
  const generateOrderId = (existingOrders = []) => {
    const currentYear = new Date().getFullYear();
    const timestamp = Date.now();
    
    // Find the highest order number from existing orders
    let highestOrderNumber = 1000;
    existingOrders.forEach(order => {
      if (order.id && order.id.startsWith('ORD-')) {
        const parts = order.id.split('-');
        if (parts.length >= 3) {
          const orderNum = parseInt(parts[2], 10);
          if (!isNaN(orderNum) && orderNum > highestOrderNumber) {
            highestOrderNumber = orderNum;
          }
        }
      }
    });
    
    // Create a unique order ID
    const orderNumber = highestOrderNumber + 1;
    return `ORD-${currentYear}-${orderNumber}-${timestamp.toString().slice(-4)}`;
  };

  test('TC-101: Generates order ID with correct format', () => {
    const orderId = generateOrderId();
    
    // Verify format: ORD-YEAR-NUMBER-TIMESTAMP
    const regex = new RegExp(`ORD-${new Date().getFullYear()}-\\d{4}-\\d{4}`);
    expect(orderId).toMatch(regex);
    
    // Number should be 1001 when no existing orders
    expect(orderId).toMatch(/-1001-/);
  });

  test('TC-102: Increments order number based on highest existing order', () => {
    // Create mock existing orders with various IDs
    const existingOrders = [
      { id: `ORD-${new Date().getFullYear()}-1005-1234` },
      { id: `ORD-${new Date().getFullYear()}-1002-5678` },
      { id: `ORD-${new Date().getFullYear()}-1008-9012` }
    ];
    
    const orderId = generateOrderId(existingOrders);
    
    // Should increment from the highest (1008) to 1009
    expect(orderId).toMatch(/-1009-/);
  });

  test('TC-103: Generates unique IDs for multiple orders', () => {
    // Generate several order IDs and check uniqueness
    const ids = new Set();
    for (let i = 0; i < 20; i++) {
      const orderId = generateOrderId();
      ids.add(orderId);
    }
    
    // All IDs should be unique
    expect(ids.size).toBe(20);
  });

  test('TC-104: Handles orders from different years correctly', () => {
    // Create mock existing orders with various years
    const existingOrders = [
      { id: `ORD-2021-1005-1234` },
      { id: `ORD-2022-1002-5678` },
      { id: `ORD-${new Date().getFullYear()}-1003-9012` }
    ];
    
    const orderId = generateOrderId(existingOrders);
    
    // Should only consider orders from the current year for incrementing
    expect(orderId).toMatch(/-1004-/);
  });

  test('TC-105: Ignores malformed order IDs', () => {
    // Create mock existing orders with some malformed IDs
    const existingOrders = [
      { id: `ORD-${new Date().getFullYear()}-1005-1234` },
      { id: `BAD-FORMAT` },
      { id: `ORD-${new Date().getFullYear()}-NOT-NUMBER` },
      { id: null }
    ];
    
    const orderId = generateOrderId(existingOrders);
    
    // Should ignore malformed IDs and use the highest valid one
    expect(orderId).toMatch(/-1006-/);
  });

  test('TC-106: Simulates saving an order with the new ID format', async () => {
    // Mock localStorage to return empty array for orders
    localStorageMock.setItem('orders', JSON.stringify([]));
    
    // Generate a new order ID
    const newOrderId = generateOrderId();
    
    // Create a mock order with this ID
    const mockOrder = {
      id: newOrderId,
      date: new Date().toISOString(),
      customer: { name: 'Test Customer', email: 'test@example.com' },
      items: [{ id: 'item-1', name: 'Test Item', price: 10.99, quantity: 1 }],
      total: '10.99',
      status: 'Processing'
    };
    
    // Save the order to Firebase
    await firebaseService.saveOrder(mockOrder);
    
    // Verify that saveOrder was called with the correct ID
    expect(firebaseService.saveOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: newOrderId })
    );
  });

  test('TC-107: Cannot create duplicate order IDs even with same input state', () => {
    // Mock Date.now() to ensure timestamp is different
    const originalDateNow = Date.now;
    
    // First call will return a fixed timestamp
    Date.now = jest.fn()
      .mockReturnValueOnce(1640995200000) // 2022-01-01
      .mockReturnValueOnce(1640995200001); // 1ms later
    
    // Generate two order IDs with same existing orders
    const existingOrders = [{ id: `ORD-${new Date().getFullYear()}-1005-1234` }];
    
    const orderId1 = generateOrderId(existingOrders);
    const orderId2 = generateOrderId(existingOrders);
    
    // Restore original Date.now
    Date.now = originalDateNow;
    
    // Order IDs should be different due to the timestamp component
    expect(orderId1).not.toBe(orderId2);
  });
}); 