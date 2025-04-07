# Inventory Management System - Manual Test Cases

This document outlines manual test cases to verify inventory management functionality that is difficult to automate or requires visual inspection.

## Inventory Creation and Visual Management

### TC-M101: Image Upload and Preview
- [ ] Upload a small image (under 1MB)
- [ ] Upload a large image (over 5MB)
- [ ] Upload an image with non-ASCII characters in filename
- [ ] Verify image previews show correctly in the UI
- [ ] Verify thumbnail generation works correctly

### TC-M102: Multi-image Management
- [ ] Upload multiple images for a single product
- [ ] Rearrange image order by drag and drop
- [ ] Set a different image as the main product image
- [ ] Delete an image and verify it's removed from the sequence

### TC-M103: Rich Text Description Editor
- [ ] Create a plant description with formatted text (bold, italic, bullets)
- [ ] Add links within product description
- [ ] Verify formatting appears correctly in preview
- [ ] Verify formatting appears correctly on shop page

## Inventory Dashboard and Reporting

### TC-M104: Inventory Dashboard Responsiveness
- [ ] Access inventory dashboard on desktop
- [ ] Access inventory dashboard on tablet
- [ ] Access inventory dashboard on mobile
- [ ] Verify all critical controls are accessible on each device
- [ ] Verify data tables reflow properly on smaller screens

### TC-M105: Inventory Report Generation
- [ ] Generate an inventory valuation report
- [ ] Generate a low stock report
- [ ] Export inventory report to CSV
- [ ] Verify report includes all relevant fields (ID, name, stock, value)
- [ ] Verify numeric totals are calculated correctly

### TC-M106: Inventory Visualization
- [ ] View stock level charts
- [ ] Filter visualizations by category
- [ ] Verify charts update when data changes
- [ ] Test zoom and pan on charts (if applicable)
- [ ] Verify charts are readable on different screen sizes

## Batch Operations

### TC-M107: Bulk Import
- [ ] Import inventory from a CSV file
- [ ] Verify validation errors are shown for invalid rows
- [ ] Verify success count matches expected
- [ ] Verify imported data appears correctly in inventory list

### TC-M108: Bulk Export
- [ ] Export all inventory to CSV
- [ ] Export filtered inventory to CSV
- [ ] Verify export includes all relevant fields
- [ ] Verify CSV can be re-imported without data loss

### TC-M109: Bulk Category Assignment
- [ ] Select multiple products
- [ ] Assign them to a category in a single operation
- [ ] Verify all selected products appear in the category

## Order Integration

### TC-M110: Order Impact on Inventory
- [ ] Place an order for items with sufficient stock
- [ ] Verify inventory decreases accordingly
- [ ] Place an order for items with barely sufficient stock
- [ ] Verify items move to "Low Stock" or "Out of Stock" as appropriate

### TC-M111: Multi-user Concurrent Access
- [ ] Have two admin users access inventory management simultaneously
- [ ] Have one user update stock levels while the other views
- [ ] Verify changes made by one user are reflected for the other
- [ ] Have both users attempt to edit the same product simultaneously
- [ ] Verify conflict resolution works as expected

### TC-M112: Inventory Alerts
- [ ] Reduce stock to below low stock threshold
- [ ] Verify alert appears in admin dashboard
- [ ] Verify alert email is sent (if configured)
- [ ] Mark alert as acknowledged and verify it's recorded

## Seasonal Management

### TC-M113: Seasonal Product Transitions
- [ ] Set up a product with seasonal availability
- [ ] Verify product appears when in season
- [ ] Verify product is hidden when out of season
- [ ] Verify appropriate customer messaging for seasonal products

### TC-M114: Scheduled Price Changes
- [ ] Set up a scheduled price change for a future date
- [ ] Verify price updates automatically when date arrives
- [ ] Verify historical pricing is maintained in reports

## Performance and Edge Cases

### TC-M115: Large Inventory Performance
- [ ] Load inventory with 500+ products
- [ ] Measure page load time
- [ ] Test search and filter responsiveness with large dataset
- [ ] Test pagination with large dataset

### TC-M116: Inventory Recovery from Network Interruption
- [ ] Begin editing a product
- [ ] Disconnect from network
- [ ] Make changes and attempt to save
- [ ] Reconnect to network
- [ ] Verify sync recovery functions correctly

### TC-M117: Image CDN Fallback
- [ ] Simulate image CDN failure
- [ ] Verify fallback image delivery works
- [ ] Verify appropriate error handling in UI

## Accessibility

### TC-M118: Keyboard Navigation
- [ ] Complete full inventory management workflow using only keyboard
- [ ] Verify all interactive elements are focusable
- [ ] Verify modal dialogs handle focus correctly
- [ ] Verify drag and drop operations have keyboard alternatives

### TC-M119: Screen Reader Compatibility
- [ ] Use a screen reader to navigate inventory list
- [ ] Verify data tables have appropriate ARIA labels
- [ ] Verify form inputs are properly labeled
- [ ] Verify error messages are announced

## Notes for Testers

1. **Environment Setup**: Run these tests in both development and production environments
2. **Browser Coverage**: Test on Chrome, Firefox, Safari, and Edge at minimum
3. **Device Coverage**: Test on desktop, tablet, and mobile devices
4. **Record Issues**: Document any problems with screenshots and detailed reproduction steps
5. **Regression**: Re-run critical tests after any significant updates to the inventory management system 