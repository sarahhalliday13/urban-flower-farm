# Manual Test Cases

This document contains general manual test procedures for the Urban Flower Farm application.

## General Setup

1. Clear browser cache and local storage
2. Start development server
3. Open application in supported browsers:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)

## User Flow Test Cases

### TC-M001: Customer Shopping Flow

1. **Browse Products**
   - Navigate to shop page
   - Filter by categories
   - Sort by price/name
   - Expected: Smooth navigation and filtering

2. **Add to Cart**
   - View product details
   - Select quantity
   - Add to cart
   - Expected: Item added with correct quantity

3. **Checkout Process**
   - Review cart
   - Enter customer details
   - Submit order
   - Expected: Order confirmation received

### TC-M002: User Account Management

1. **Login/Logout**
   - Login with valid credentials
   - Verify access to protected pages
   - Logout
   - Expected: Proper authentication flow

2. **Order History**
   - View past orders
   - Check order details
   - Expected: Complete order history shown

### TC-M003: Admin Functions

1. **Inventory Management**
   - Add new products
   - Update existing products
   - Remove products
   - Expected: Changes reflect immediately

2. **Order Processing**
   - View incoming orders
   - Update order status
   - Send notifications
   - Expected: Status updates properly

## Cross-Browser Testing

1. **Layout Consistency**
   - Check all pages in each browser
   - Verify responsive design
   - Expected: Consistent appearance

2. **Functionality**
   - Test all features in each browser
   - Verify forms and validation
   - Expected: Consistent behavior

## Mobile Testing

1. **Mobile Layout**
   - Test on various screen sizes
   - Check touch interactions
   - Verify mobile navigation
   - Expected: Mobile-friendly experience

2. **Mobile Features**
   - Test cart management
   - Check checkout process
   - Verify image loading
   - Expected: Full functionality on mobile

## Error Handling

1. **Form Validation**
   - Submit empty forms
   - Enter invalid data
   - Expected: Clear error messages

2. **Network Issues**
   - Test offline behavior
   - Check error recovery
   - Expected: Graceful error handling

## Performance Testing

1. **Page Load**
   - Measure initial load time
   - Check subsequent navigation
   - Expected: Quick, smooth loading

2. **Image Loading**
   - Test with many images
   - Check lazy loading
   - Expected: Efficient image handling

## Accessibility Testing

1. **Keyboard Navigation**
   - Navigate all features
   - Test focus management
   - Expected: Full keyboard access

2. **Screen Reader**
   - Test with screen reader
   - Verify ARIA attributes
   - Expected: Proper accessibility

## Documentation

After completing tests:
1. Document any issues found
2. Note browser-specific problems
3. Update test cases if needed
4. Report performance metrics 