# Inventory Management Manual Tests

This document outlines manual test procedures for the inventory management system.

## Test Environment Setup

1. Start local development server
2. Clear browser cache and local storage
3. Log in as admin user
4. Navigate to `/admin/inventory`

## Test Cases

### TC-M001: Basic Inventory Operations

1. **Add New Item**
   - Click "Add New Item"
   - Fill in required fields
   - Save and verify item appears in list
   - Expected: Item saved with correct details

2. **Edit Existing Item**
   - Find existing item
   - Click edit button
   - Modify fields
   - Save changes
   - Expected: Changes persist after refresh

3. **Delete Item**
   - Select item to delete
   - Click delete button
   - Confirm deletion
   - Expected: Item removed from list

### TC-M002: Stock Management

1. **Update Stock Level**
   - Find item with stock
   - Change stock quantity
   - Save changes
   - Expected: Stock level updates in real-time

2. **Low Stock Alerts**
   - Reduce stock below threshold
   - Expected: Item shows low stock warning
   - Expected: Alert appears in admin dashboard

3. **Out of Stock Handling**
   - Set stock to 0
   - Expected: Status changes to "Out of Stock"
   - Expected: Item shows as unavailable in shop

### TC-M003: Image Management

1. **Add Images**
   - Select item
   - Upload new image
   - Expected: Image uploads and displays correctly

2. **Replace Images**
   - Find item with existing image
   - Upload new image
   - Expected: New image replaces old one

3. **Remove Images**
   - Find item with image
   - Delete image
   - Expected: Default placeholder shows

### TC-M004: Batch Operations

1. **Bulk Status Update**
   - Select multiple items
   - Change status
   - Expected: All selected items update

2. **Bulk Stock Update**
   - Select multiple items
   - Update stock levels
   - Expected: All selected items update correctly

## Error Cases

1. **Invalid Input**
   - Enter negative stock numbers
   - Enter invalid prices
   - Expected: Validation errors shown

2. **Network Issues**
   - Disable network
   - Try operations
   - Expected: Appropriate error messages
   - Expected: Changes saved locally

3. **Concurrent Updates**
   - Open same item in two windows
   - Make changes in both
   - Expected: Last save wins, no data corruption

## Performance Tests

1. **Large Inventory**
   - Load 100+ items
   - Verify smooth scrolling
   - Verify quick filtering/search

2. **Image Loading**
   - Load page with many images
   - Verify progressive loading
   - Check memory usage

## Cleanup

After testing:
1. Reset test data
2. Clear local storage
3. Document any issues found
4. Update test cases if needed 