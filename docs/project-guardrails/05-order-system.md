# Order System Guidelines

## Approved Functions

Only use these authorized functions for order operations:

```javascript
getOrders()      // Fetch orders
updateOrder()    // Modify existing order
deleteOrder()    // Remove order
fetchOrderNotes() // Get customer notes
```

## Restricted Areas

The following areas must NOT be modified:

1. **Checkout Logic**
   - Payment processing
   - Cart calculations
   - Checkout flow
   - Order submission

2. **Order Creation Pipeline**
   - Order number generation
   - Initial order processing
   - Data validation
   - Status assignment

3. **Customer Cart/Payment**
   - Cart functionality
   - Payment methods
   - Price calculations
   - Discount handling

4. **Inventory Flow**
   - Stock management
   - Availability checks
   - Product updates
   - Exception: Order sync related changes

## Required Behaviors

1. **Order Updates**
   - Must correctly update totals
   - Must recreate invoices when needed
   - Must maintain data integrity
   - Must preserve customer notes

2. **Data Validation**
   - Verify all calculations
   - Ensure proper formatting
   - Validate all updates
   - Check data consistency

3. **Integration Points**
   - Maintain inventory sync
   - Preserve email triggers
   - Keep payment processing
   - Maintain logging

## Testing Requirements

Before any changes:
- Verify order calculations
- Test invoice generation
- Check email notifications
- Validate inventory updates
- Test status changes

## Important Notes

- Always maintain data integrity
- Preserve existing business logic
- Document any changes thoroughly
- Test extensively before deployment
- Monitor for unexpected side effects 