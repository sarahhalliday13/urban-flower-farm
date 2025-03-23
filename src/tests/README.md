# Order Management System QA Tests

This directory contains automated test cases for the Order Management System. The tests verify critical functionality from both customer and admin perspectives.

## Test Coverage

The test suite covers the following areas:

### Checkout Process
- TC-001: User can place an order with valid information
- TC-002: Validation prevents order submission with missing required fields
- TC-003: Order updates inventory correctly after successful order

### Customer Order Viewing
- TC-004: Customer can view their order history
- TC-005: Customer can view order details
- TC-006: Orders are filtered by customer email

### Admin Order Management
- TC-007: Admin can view all orders
- TC-008: Admin can filter orders by status
- TC-009: Admin can search orders by customer name or email
- TC-010: Admin can update order status
- TC-011: Admin can view order details and customer information

### Error Handling
- TC-012: System handles Firebase errors during order placement gracefully
- TC-013: Admin view handles missing orders data gracefully

## Running the Tests

To run all tests:

```bash
npm test
```

To run only the order management tests:

```bash
npm test -- -t "Order Management System Tests"
```

To run a specific test case (using the TC-XXX identifier):

```bash
npm test -- -t "TC-001"
```

## Test Structure

The tests use React Testing Library and Jest. Key aspects of the test implementation:

1. **Mocking**: Firebase services, React Router navigation, and localStorage are mocked to test functionality without external dependencies.

2. **Provider Setup**: Tests are wrapped with necessary context providers (BrowserRouter, CartProvider) to ensure components have access to required context.

3. **Test Isolation**: Each test resets mocks and clears localStorage to prevent test interference.

## Additional Test Scenarios

For manual testing, consider these additional scenarios:

1. **Performance**: Test the admin view with a large number of orders (100+) to ensure filtering and search remain responsive.

2. **Concurrent Orders**: Test multiple users placing orders at the same time to ensure order IDs remain unique and inventory updates correctly.

3. **Mobile Responsiveness**: Verify order management UI is functional on mobile devices.

4. **Accessibility**: Check that order forms and admin screens are accessible to screen readers and keyboard navigation.

5. **Order Email Notifications**: Verify email notifications are triggered correctly upon order status changes. 