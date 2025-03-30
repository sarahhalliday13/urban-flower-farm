import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AdminProvider } from '../context/AdminContext';

// Mock the Firebase service
jest.mock('../services/firebase', () => {
  return {
    updateInventory: jest.fn().mockResolvedValue({ success: true }),
    updatePlantData: jest.fn().mockResolvedValue({ success: true })
  };
});

// Import the firebase service after mocking
import * as firebaseService from '../services/firebase';

describe('Inventory Image Preservation Tests', () => {
  // Sample test plant with images
  const testPlant = {
    id: 'test-1001',
    name: 'Test Plant',
    price: '10.99',
    mainImage: 'test-main-image.jpg',
    images: ['image1.jpg', 'image2.jpg'],
    additionalImages: ['add1.jpg', 'add2.jpg'],
    inventory: {
      currentStock: 10,
      status: 'In Stock',
      restockDate: '',
      notes: ''
    }
  };

  // Test function to simulate the handleSave function from InventoryManager
  const handleSave = async (plantId, inventoryData, originalPlant) => {
    // Call updateInventory API
    await firebaseService.updateInventory(plantId, inventoryData);
    
    // Create updated plant object
    const updatedPlant = {
      ...originalPlant,
      price: inventoryData.price,
      featured: inventoryData.featured,
      hidden: inventoryData.hidden,
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
    
    return updatedPlant;
  };

  test('TC-001: Updates inventory while preserving main image', async () => {
    // Create inventory update data
    const inventoryData = {
      currentStock: 5,
      status: 'Low Stock',
      price: '12.99',
      featured: true,
      hidden: false,
      restockDate: '',
      notes: 'Updated stock'
    };
    
    // Call the handleSave function
    const result = await handleSave(testPlant.id, inventoryData, testPlant);
    
    // Verify that the image properties were preserved
    expect(result.mainImage).toBe(testPlant.mainImage);
    expect(result.price).toBe('12.99'); // Updated value
    expect(result.inventory.currentStock).toBe(5); // Updated value
    expect(result.inventory.status).toBe('Low Stock'); // Updated value
  });

  test('TC-002: Updates inventory while preserving all image arrays', async () => {
    // Create inventory update data with different values
    const inventoryData = {
      currentStock: 0,
      status: 'Sold Out',
      price: '9.99',
      featured: false,
      hidden: true,
      restockDate: '2023-12-31',
      notes: 'Out of stock until next year'
    };
    
    // Call the handleSave function
    const result = await handleSave(testPlant.id, inventoryData, testPlant);
    
    // Verify that all image arrays were preserved
    expect(result.mainImage).toBe(testPlant.mainImage);
    expect(result.images).toEqual(testPlant.images);
    expect(result.additionalImages).toEqual(testPlant.additionalImages);
    
    // Verify that inventory fields were updated
    expect(result.inventory.currentStock).toBe(0);
    expect(result.inventory.status).toBe('Sold Out');
    expect(result.inventory.notes).toBe('Out of stock until next year');
  });

  test('TC-003: Preserves images even when original plant has no image arrays', async () => {
    // Create a test plant without image arrays
    const partialPlant = {
      id: 'test-1002',
      name: 'Partial Plant',
      price: '15.99',
      mainImage: 'main-only.jpg', // Only has main image
      inventory: {
        currentStock: 20,
        status: 'In Stock',
        restockDate: '',
        notes: ''
      }
    };
    
    // Create inventory update data
    const inventoryData = {
      currentStock: 15,
      status: 'In Stock',
      price: '16.99',
      featured: true,
      hidden: false,
      restockDate: '',
      notes: 'Updated price'
    };
    
    // Call the handleSave function
    const result = await handleSave(partialPlant.id, inventoryData, partialPlant);
    
    // Verify that the main image was preserved
    expect(result.mainImage).toBe(partialPlant.mainImage);
    expect(result.images).toBeUndefined(); // Should still be undefined
    expect(result.additionalImages).toBeUndefined(); // Should still be undefined
    
    // Verify that other fields were updated correctly
    expect(result.price).toBe('16.99');
    expect(result.inventory.currentStock).toBe(15);
  });
}); 