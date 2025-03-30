import React from 'react';
import { render } from '@testing-library/react';
import { CartProvider } from '../context/CartContext';

/**
 * Sample orders data for testing
 */
export const sampleOrders = [
  {
    id: 'ORD-2023-001',
    date: new Date(2023, 5, 15).toISOString(),
    status: 'Completed',
    total: 78.50,
    customer: {
      name: 'Jane Smith',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '555-123-4567',
      address: {
        street: '123 Garden Lane',
        city: 'Flowertown',
        state: 'CA',
        zip: '90210'
      }
    },
    items: [
      { id: 'PLT-001', name: 'Lavender - French', price: 12.50, quantity: 3 },
      { id: 'PLT-002', name: 'Sunflower - Giant', price: 8.00, quantity: 2 },
      { id: 'PLT-003', name: 'Rose - Climbing', price: 25.00, quantity: 1 }
    ],
    notes: 'Please leave the package by the side gate if no one is home.'
  },
  {
    id: 'ORD-2023-002',
    date: new Date(2023, 6, 22).toISOString(),
    status: 'Shipped',
    total: 45.75,
    customer: {
      name: 'Jane Smith',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '555-123-4567',
      address: {
        street: '123 Garden Lane',
        city: 'Flowertown',
        state: 'CA',
        zip: '90210'
      }
    },
    items: [
      { id: 'PLT-004', name: 'Dahlia - Mixed Colors', price: 15.25, quantity: 3 }
    ],
    notes: 'Birthday gift for mom, please include a note saying "Happy Birthday!"'
  },
  {
    id: 'ORD-2023-003',
    date: new Date(2023, 7, 5).toISOString(),
    status: 'Processing',
    total: 32.99,
    customer: {
      name: 'Bob Johnson',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@example.com',
      phone: '555-987-6543',
      address: {
        street: '456 Plant Ave',
        city: 'Greenville',
        state: 'OR',
        zip: '97123'
      }
    },
    items: [
      { id: 'PLT-005', name: 'Herb Collection', price: 32.99, quantity: 1 }
    ]
  }
];

/**
 * Sample cart items for testing
 */
export const sampleCartItems = [
  { id: 'PLT-001', name: 'Lavender - French', price: 12.50, quantity: 3, inventory: { currentStock: 20 } },
  { id: 'PLT-002', name: 'Sunflower - Giant', price: 8.00, quantity: 2, inventory: { currentStock: 15 } },
];

/**
 * Sample plants data for testing
 */
export const samplePlants = [
  {
    id: 'PLT-001',
    name: 'Lavender - French',
    scientificName: 'Lavandula dentata',
    price: 12.50,
    description: 'Fragrant purple flowers, drought tolerant',
    light: 'Full Sun',
    height: '18-24 inches',
    plantType: 'Perennial',
    featured: true,
    image: 'https://example.com/lavender.jpg',
    categories: ['Perennial', 'Drought Tolerant', 'Fragrant']
  },
  {
    id: 'PLT-002',
    name: 'Sunflower - Giant',
    scientificName: 'Helianthus annuus',
    price: 8.00,
    description: 'Tall sunflower with large yellow blooms',
    light: 'Full Sun',
    height: '6-8 feet',
    plantType: 'Annual',
    featured: false,
    image: 'https://example.com/sunflower.jpg',
    categories: ['Annual', 'Sun Loving']
  },
  {
    id: 'PLT-003',
    name: 'Rose - Climbing',
    scientificName: 'Rosa multiflora',
    price: 25.00,
    description: 'Beautiful climbing rose with pink flowers',
    light: 'Full Sun to Partial Shade',
    height: '8-12 feet',
    plantType: 'Perennial',
    featured: true,
    image: 'https://example.com/rose.jpg',
    categories: ['Perennial', 'Flowering', 'Fragrant']
  }
];

/**
 * Sample inventory data for testing
 */
export const sampleInventory = {
  'PLT-001': {
    currentStock: 20,
    status: 'In Stock',
    restockDate: '',
    lastUpdated: '2023-03-01T12:00:00Z',
  },
  'PLT-002': {
    currentStock: 15,
    status: 'Low Stock',
    restockDate: '2023-04-01',
    lastUpdated: '2023-03-01T12:00:00Z',
  },
  'PLT-003': {
    currentStock: 0,
    status: 'Out of Stock',
    restockDate: '2023-05-15',
    lastUpdated: '2023-03-01T12:00:00Z',
  }
};

/**
 * Sample plant categories for testing
 */
export const sampleCategories = [
  { id: 'cat-1', name: 'Perennial', description: 'Plants that live for more than two years' },
  { id: 'cat-2', name: 'Annual', description: 'Plants that complete their life cycle in one year' },
  { id: 'cat-3', name: 'Drought Tolerant', description: 'Plants that require minimal watering' },
  { id: 'cat-4', name: 'Fragrant', description: 'Plants with pleasant scents' },
  { id: 'cat-5', name: 'Sun Loving', description: 'Plants that thrive in full sun' },
  { id: 'cat-6', name: 'Shade Tolerant', description: 'Plants that grow well in partial or full shade' },
  { id: 'cat-7', name: 'Flowering', description: 'Plants grown primarily for their flowers' },
  { id: 'cat-8', name: 'Edible', description: 'Plants with edible parts' }
];

/**
 * Creates mock local storage
 * @returns {Object} Mock localStorage implementation
 */
export function createMockLocalStorage() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getStore: () => store
  };
}

/**
 * Installs mock localStorage to window
 * @param {Object} mockStorage - The mock storage object to install
 */
export function installMockLocalStorage(mockStorage) {
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true
  });
}

/**
 * Mock the Firebase service functions
 * @returns {Object} Mocked Firebase functions
 */
export function createFirebaseMocks() {
  return {
    saveOrder: jest.fn().mockResolvedValue(true),
    getOrders: jest.fn().mockResolvedValue(sampleOrders),
    updateOrderStatus: jest.fn().mockResolvedValue(true),
    updateInventory: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Creates a mock for useNavigate
 * @returns {Object} Mock navigate function
 */
export const createMockNavigate = () => jest.fn();

/**
 * Creates a mock for useLocation with custom pathname
 * @param {string} pathname - The pathname to return
 * @returns {Function} Mock useLocation function
 */
export const createMockLocation = (pathname = '/checkout') => () => ({ pathname });

/**
 * Creates a mock cart context
 * @param {Array} items - Cart items to include
 * @returns {Object} Mock cart context
 */
export function createMockCartContext(items = sampleCartItems) {
  return {
    cartItems: items,
    getTotal: jest.fn().mockReturnValue(
      items.reduce((total, item) => total + (item.price * item.quantity), 0)
    ),
    clearCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    addToCart: jest.fn(),
    itemCount: items.reduce((count, item) => count + item.quantity, 0)
  };
}

/**
 * Mock functions specific to inventory management
 */
export function createInventoryMocks() {
  return {
    fetchPlants: jest.fn().mockResolvedValue(samplePlants),
    updatePlant: jest.fn().mockResolvedValue({ success: true }),
    addPlant: jest.fn().mockResolvedValue({ success: true, plantId: 'PLT-NEW' }),
    deletePlant: jest.fn().mockResolvedValue({ success: true }),
    updateInventory: jest.fn().mockResolvedValue({ success: true }),
    subscribeToInventory: jest.fn().mockImplementation(callback => {
      callback(sampleInventory);
      return () => {}; // unsubscribe function
    }),
    processSyncQueue: jest.fn().mockResolvedValue({ success: true, processed: 0 }),
    repairInventoryData: jest.fn().mockResolvedValue({ success: true, repaired: 0 }),
  };
}

/**
 * Creates a mock admin context
 */
export function createMockAdminContext() {
  return {
    isAdmin: true,
    plants: samplePlants,
    loading: false,
    error: null,
    loadPlants: jest.fn(),
    updatePlantData: jest.fn().mockResolvedValue({ success: true }),
    addNewPlant: jest.fn().mockResolvedValue({ success: true, plantId: 'PLT-NEW' }),
    deletePlant: jest.fn().mockResolvedValue({ success: true }),
    logout: jest.fn(),
  };
}

/**
 * Render with providers
 * @param {React.ReactNode} ui - The component to render
 * @param {Object} options - Additional render options
 * @returns {Object} The rendered component with utilities
 */
export const renderWithProviders = (ui, { cartContext = null, ...options } = {}) => {
  return render(
    <div className="test-wrapper">
      <CartProvider initialCart={cartContext?.cartItems || []}>
        {ui}
      </CartProvider>
    </div>,
    options
  );
}; 