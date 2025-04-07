# Order Management System - Manual Test Cases

This document outlines manual test cases to verify order management functionality that is difficult to automate or requires visual inspection.

## Checkout Process

### TC-M001: Cart to Checkout Transition
- [ ] Add multiple items to cart
- [ ] Navigate to checkout from cart
- [ ] Verify all cart items appear in checkout summary with correct quantities and prices
- [ ] Verify total matches sum of item prices × quantities

### TC-M002: Form Validation UI Feedback
- [ ] Submit checkout form with various invalid inputs to verify validation messages appear:
  - [ ] Empty required fields
  - [ ] Invalid email format
  - [ ] Invalid phone format
- [ ] Verify validation feedback is immediate and clear
- [ ] Verify form maintains data when validation fails

### TC-M003: Checkout Confirmation
- [ ] Complete checkout process
- [ ] Verify confirmation screen displays:
  - [ ] Order ID
  - [ ] Total amount
  - [ ] Customer information
  - [ ] Order summary
- [ ] Verify "copy order ID" functionality works

## Order Management (Admin)

### TC-M004: Order Status Workflow
- [ ] Create a new order (should start as "Processing")
- [ ] Update order to "Shipped" status
- [ ] Update order to "Completed" status
- [ ] Update order to "Cancelled" status
- [ ] Verify each status change is reflected immediately in the order list

### TC-M005: Order Filtering UX
- [ ] Populate system with orders of various statuses
- [ ] Test each filter option
- [ ] Verify filter results update immediately and accurately
- [ ] Verify search function works with:
  - [ ] Customer name (partial match)
  - [ ] Email address (partial match)
  - [ ] Order ID (exact match)
  - [ ] Combination of search term and status filter

### TC-M006: Order Management Performance
- [ ] Load admin orders page with 50+ orders
- [ ] Verify page loads within acceptable time
- [ ] Verify filtering and search remain responsive
- [ ] Verify scrolling through large order list is smooth

## Mobile Responsiveness

### TC-M007: Checkout Mobile Experience
- [ ] Complete checkout process on mobile device or emulator
- [ ] Verify all form fields are accessible and easy to fill
- [ ] Verify validation messages are clearly visible
- [ ] Verify buttons are sufficiently large for touch input

### TC-M008: Admin Orders Mobile Experience
- [ ] Access admin orders view on mobile device
- [ ] Verify order list is readable
- [ ] Verify filter and search controls are accessible
- [ ] Verify order details expand/collapse works properly on touch
- [ ] Verify status update controls work properly

## Edge Cases

### TC-M009: Session Handling
- [ ] Place an order
- [ ] Close browser and reopen
- [ ] Navigate to Orders page
- [ ] Verify previously placed order is accessible

### TC-M010: Inventory Edge Cases
- [ ] Attempt to order a product with exactly the available inventory amount
- [ ] Verify order processes successfully
- [ ] Verify inventory is updated to zero
- [ ] Attempt to order a product with more than available inventory
- [ ] Verify appropriate error/warning message

### TC-M011: Concurrent Users
- [ ] Have two users/sessions attempt to order the same low-inventory product simultaneously
- [ ] Verify inventory is correctly managed (no overselling)
- [ ] Verify both users receive appropriate feedback

## Accessibility

### TC-M012: Keyboard Navigation
- [ ] Complete entire checkout process using only keyboard
- [ ] Navigate admin order management using only keyboard
- [ ] Verify all interactive elements are focusable
- [ ] Verify focus order is logical

### TC-M013: Screen Reader Compatibility
- [ ] Use a screen reader to complete the checkout process
- [ ] Verify all form fields have appropriate labels
- [ ] Verify error messages are announced
- [ ] Verify order details are properly announced in the admin view

## Notes for Testers

1. **Environment Setup**: Run these tests in both development and production environments
2. **Browser Coverage**: Test on Chrome, Firefox, Safari, and Edge at minimum
3. **Device Coverage**: Test on desktop, tablet, and mobile devices
4. **Record Issues**: Document any problems with screenshots and detailed reproduction steps
5. **Regression**: Re-run critical tests after any significant updates to the order management system 