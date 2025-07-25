# Admin Refactoring Guidelines

## Refactoring Sequence

The admin refactoring must follow this exact sequence:

1. `/admin/orders`
   - Most complex component
   - Connected to inventory functionality
   - Must be completed and verified first

2. `/admin/inventory`
   - Only start after orders is complete
   - Verify all order interactions

3. `/admin/editaddplant`
   - Final component to refactor
   - Benefits from previous updates
   - Connected to both orders and inventory

## Core Requirements

1. **Order Number Format**
   - Must maintain format: `ORD-YYYY-XXXX`
   - Starts at 1017 for 2025
   - Must be unique and sequential

2. **Login Functionality**
   - Must redirect to `/admin/dashboard`
   - Must remain protected route
   - Preserve existing auth flow

3. **Customer-Facing Views**
   - No modifications allowed
   - Preserve all existing functionality
   - Maintain current user experience

## Integration Points

Must preserve these critical integrations:
- Checkout process
- Invoice generation
- Frontend plant data
- Inventory synchronization
- Email notifications
- Payment processing

## Feature Preservation

1. **Orders Page**
   - Order filtering and search
   - Status management
   - Invoice generation
   - Payment tracking
   - Customer notes

2. **Inventory Management**
   - Stock levels
   - Price updates
   - Availability status
   - Product details

3. **Plant Editor**
   - Image handling
   - Product information
   - Inventory details
   - Pricing data

## Important Notes

- Test thoroughly after each refactor
- Maintain existing data structures
- Document all changes
- Verify all integrations
- Keep security measures intact
- Preserve business logic 