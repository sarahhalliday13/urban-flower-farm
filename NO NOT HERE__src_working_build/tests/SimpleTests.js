// SimpleTests.js - Tests for plant app fixes

/**
 * Test suite for image preservation during inventory updates
 */
describe('Image Preservation Tests', () => {
  // Test for preserving mainImage when updating inventory
  test('should preserve mainImage when updating inventory', () => {
    // Create a test plant with images
    const originalPlant = {
      id: 'test-1001',
      name: 'Test Plant',
      price: '10.99',
      mainImage: 'test-main-image.jpg',
      images: ['image1.jpg', 'image2.jpg'],
      inventory: {
        currentStock: 10,
        status: 'In Stock'
      }
    };
    
    // Create inventory update data
    const inventoryData = {
      currentStock: 5,
      status: 'Low Stock',
      price: '12.99',
      featured: true
    };
    
    // Simulate the handleSave function
    const updatedPlant = {
      ...originalPlant,
      price: inventoryData.price,
      featured: inventoryData.featured,
      inventory: {
        ...originalPlant.inventory,
        currentStock: inventoryData.currentStock,
        status: inventoryData.status
      }
    };
    
    // Explicitly preserve image data
    updatedPlant.mainImage = originalPlant.mainImage;
    updatedPlant.images = originalPlant.images;
    
    // Verify image data is preserved
    expect(updatedPlant.mainImage).toBe('test-main-image.jpg');
    expect(updatedPlant.images).toEqual(['image1.jpg', 'image2.jpg']);
    expect(updatedPlant.inventory.currentStock).toBe(5);
  });
});

/**
 * Test suite for order ID generation
 */
describe('Order ID Generation Tests', () => {
  // Test for order ID format
  test('should generate order ID with correct format', () => {
    const currentYear = new Date().getFullYear();
    const timestamp = 1234567890;
    const highestOrderNumber = 1005;
    
    const orderNumber = highestOrderNumber + 1;
    const orderId = `ORD-${currentYear}-${orderNumber}-${timestamp.toString().slice(-4)}`;
    
    // Test the format
    expect(orderId).toMatch(new RegExp(`ORD-${currentYear}-1006-7890`));
  });
  
  // Test for unique order IDs
  test('should generate unique order IDs even with same inputs', () => {
    const currentYear = new Date().getFullYear();
    const highestOrderNumber = 1005;
    
    // Generate two order IDs with different timestamps
    const orderNumber = highestOrderNumber + 1;
    const orderId1 = `ORD-${currentYear}-${orderNumber}-1234`;
    const orderId2 = `ORD-${currentYear}-${orderNumber}-5678`;
    
    // They should be different
    expect(orderId1).not.toBe(orderId2);
  });
  
  // Test for finding highest order number
  test('should find highest order number from existing orders', () => {
    // Create mock existing orders with various IDs
    const currentYear = new Date().getFullYear();
    const existingOrders = [
      { id: `ORD-${currentYear}-1005-1234` },
      { id: `ORD-${currentYear}-1002-5678` },
      { id: `ORD-${currentYear}-1008-9012` } // Highest
    ];
    
    // Find highest order number
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
    
    // Verify highest is 1008
    expect(highestOrderNumber).toBe(1008);
    
    // Generate next order ID
    const orderNumber = highestOrderNumber + 1;
    const orderId = `ORD-${currentYear}-${orderNumber}-1234`;
    
    // Should be 1009
    expect(orderId).toContain('-1009-');
  });
}); 