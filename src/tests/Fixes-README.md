# Fixes for Plant App Issues

This document describes the fixes implemented for two major issues in the Plant App:

1. **Image Disappearing Issue**: Images would disappear when updating inventory availability or price
2. **Orders Deletion Issue**: Orders were being randomly deleted when new orders were added

## 1. Image Disappearing Issue

### Problem Description

When updating a plant's inventory information (e.g., availability, stock, price), the plant's images would disappear. This occurred because when updating these fields, the image data was not being explicitly preserved in the object sent to the state update function.

### Root Cause

In the `handleSave` function in `InventoryManager.js`, when creating the `updatedPlant` object, it was spreading the original plant object but then immediately overwriting it with partial data. Since the function used `updatePlantData` which completely replaces the plant, the image properties were lost during this update.

### Solution

The fix explicitly preserves all image-related properties when updating a plant's inventory:

```javascript
// Find the original plant to ensure we preserve all its properties
const originalPlant = plants.find(p => p.id === plantId);

// Update plant data in context - only update specific fields
const updatedPlant = {
  ...originalPlant, // Keep ALL original properties including images
  price: priceValue,
  featured: featuredValue,
  hidden: hiddenValue,
  inventory: {
    ...originalPlant?.inventory,
    currentStock: inventoryData.currentStock,
    status: inventoryData.status,
    restockDate: inventoryData.restockDate,
    notes: inventoryData.notes
  }
};

// Ensure image data is preserved explicitly
if (originalPlant) {
  // Make sure these properties are explicitly preserved
  updatedPlant.mainImage = originalPlant.mainImage;
  updatedPlant.images = originalPlant.images;
  updatedPlant.additionalImages = originalPlant.additionalImages;
}
```

The update ensures that even if image properties are nested or have unusual formatting, they will be preserved during inventory updates.

## 2. Orders Deletion Issue

### Problem Description

Orders would randomly disappear from the admin interface when new orders were added. This was happening because order IDs were conflicting, causing newer orders to overwrite older orders in Firebase.

### Root Cause

The issue was in the order ID generation logic in `Checkout.js`. It was generating order IDs based only on the last order in localStorage, which could lead to:
- IDs being reused if the orders weren't retrieved in the same order
- IDs not being unique if multiple users placed orders simultaneously
- IDs being duplicated if the localStorage data was incomplete

### Solution

The fix implements a more robust order ID generation strategy:

1. Uses a timestamp component to ensure uniqueness
2. Searches through all existing orders to find the highest order number
3. Creates IDs with format `ORD-YEAR-NUMBER-TIMESTAMP`

```javascript
// Find the highest order number from localStorage
let highestOrderNumber = 1000;
orders.forEach(order => {
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

// Create a unique order ID using timestamp and incremented order number
const orderNumber = highestOrderNumber + 1;
const timestamp = Date.now();
const newOrderId = `ORD-${currentYear}-${orderNumber}-${timestamp.toString().slice(-4)}`;
```

This approach ensures that even if multiple users create orders at the same time, or if the order list is filtered or incomplete, each new order will have a unique ID that won't conflict with existing orders.

## Automated Tests

Two automated test suites have been created to verify these fixes:

### 1. Inventory Image Preservation Tests

Tests that verify images are preserved during inventory updates.

```bash
npm run test:inventory
```

Test cases:
- TC-001: Updates inventory while preserving main image
- TC-002: Updates inventory while preserving all image arrays
- TC-003: Preserves images even when original plant has no image arrays

### 2. Order ID Generation Tests

Tests that verify order IDs are generated correctly and uniquely.

```bash
npm run test:orders
```

Test cases:
- TC-101: Generates order ID with correct format
- TC-102: Increments order number based on highest existing order
- TC-103: Generates unique IDs for multiple orders
- TC-104: Handles orders from different years correctly
- TC-105: Ignores malformed order IDs
- TC-106: Simulates saving an order with the new ID format
- TC-107: Cannot create duplicate order IDs even with same input state

### Running All Tests

To run all the tests for both fixes:

```bash
npm run test:fixes
```

## Manual Testing

In addition to the automated tests, you should perform these manual tests:

### For Image Preservation:

1. Update a plant's availability status and verify the image remains
2. Update a plant's price and verify the image remains
3. Update both price and availability and verify all images remain

### For Order ID Generation:

1. Create multiple test orders and verify they all appear in the admin interface
2. Check the format of the new order IDs (should be ORD-YEAR-NUMBER-TIMESTAMP)
3. Verify no existing orders are lost when adding new orders 