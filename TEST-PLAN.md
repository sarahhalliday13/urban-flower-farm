# Test Plan: Order Update Bug Fix

## Bug Description
**Before Fix:** Using `set()` in `updateOrder()` function would replace the entire order with partial data when updating fields like payment info, causing complete data loss.

**After Fix:** Using `update()` merges the new data with existing data, preserving all original order information.

---

## Automated Test

Run the automated test script:

```bash
node test-order-update-fix.js
```

This will:
1. Create a test order with full data
2. Update only payment info
3. Verify all original data is preserved
4. Clean up the test order

**Expected Result:** All 4 tests pass ✅

---

## Manual Testing in UI

### Prerequisites
- Access to admin dashboard
- One test order created (can be a real order or test order)

### Test Steps

#### Test 1: Update Payment Method (Primary Bug Scenario)

1. **Create/Select a Test Order**
   - Go to Admin Dashboard → Orders
   - Note down a specific order with full details:
     - Order ID: _______________
     - Customer name: _______________
     - Customer email: _______________
     - Number of items: _______________
     - Total amount: $_______________

2. **Take a "Before" Screenshot**
   - Open the order details
   - Screenshot showing all data

3. **Update Payment Information**
   - In the order editor, find payment section
   - Change payment method (e.g., from "Cash" to "E-transfer")
   - Change payment timing (e.g., "Paid on pickup" to "Paid in advance")
   - Click Save/Update

4. **Verify Data Preservation**
   - Refresh the page
   - Check that ALL the following are still present:
     - ✅ Customer name
     - ✅ Customer email
     - ✅ Customer phone
     - ✅ All order items
     - ✅ Item quantities and prices
     - ✅ Subtotal, GST, PST, Total
     - ✅ Order date
     - ✅ Payment info (updated correctly)

5. **Result:**
   - ✅ PASS: All data preserved + payment updated
   - ❌ FAIL: Any data missing (customer, items, totals)

---

#### Test 2: Update Discount

1. **Select an Order**
   - Choose an order with items

2. **Add/Update Discount**
   - Add a discount (e.g., $5.00)
   - Save changes

3. **Verify:**
   - ✅ Discount applied
   - ✅ Customer data still there
   - ✅ Items still there
   - ✅ Other fields unchanged

---

#### Test 3: Update Order Items

1. **Select an Order**
   - Choose an order

2. **Modify Items**
   - Change quantity of an item
   - Or add a new item
   - Save changes

3. **Verify:**
   - ✅ Items updated correctly
   - ✅ Customer data still there
   - ✅ Totals recalculated
   - ✅ Payment info (if any) still there

---

#### Test 4: Check Firebase Directly

1. **Go to Firebase Console**
   - Realtime Database
   - Navigate to `/orders/{test-order-id}`

2. **Before Update:**
   - Note the JSON structure
   - All fields present

3. **After Update:**
   - Check the JSON again
   - Verify only the updated field changed
   - All other fields still present

---

## What Would REPRODUCE the Bug (With Old Code)

### Scenario 1: Payment Update (Most Common)
1. Customer places order → Full order data saved ✅
2. Admin updates payment method in Order Editor
3. **BUG:** Customer info, items, totals all deleted 💥
4. Order shows as "#Unknown" with only payment data

### Scenario 2: Discount Update
1. Order exists with full data ✅
2. Admin adds/updates discount
3. **BUG:** Everything except discount deleted 💥

### Scenario 3: Any Partial Update
Any time `updateOrder()` is called with partial data:
- Invoice payment tracking
- Order status changes
- Admin notes
- Customer notes

All would trigger data loss with `set()` instead of `update()`.

---

## Testing Checklist

### Before Deploying to Staging:
- [ ] Run automated test script
- [ ] Manual Test 1: Payment update
- [ ] Manual Test 2: Discount update
- [ ] Manual Test 3: Item update
- [ ] Check Firebase data directly
- [ ] All tests pass ✅

### After Deploying to Staging:
- [ ] Repeat all manual tests on staging
- [ ] Create a staging test order
- [ ] Update payment method
- [ ] Verify no data loss
- [ ] Check Firebase staging database

### Before Deploying to Production:
- [ ] All staging tests pass
- [ ] No console errors
- [ ] Code reviewed
- [ ] Backup current production database
- [ ] Deploy during low-traffic time

---

## Rollback Plan

If the fix doesn't work or causes issues:

```bash
# On development branch
git reset --hard HEAD~1  # Undo the commit

# Or
git checkout src/services/firebase.js  # Discard changes

# Then investigate and fix
```

---

## Success Criteria

✅ **Fix is successful if:**
1. Automated test passes
2. All manual tests pass
3. Payment updates preserve all order data
4. No "Unknown" orders appear
5. Firebase shows proper data merging
6. No console errors

❌ **Fix needs more work if:**
- Any test fails
- Data still gets lost
- New bugs introduced
- Console shows errors

---

## Notes

- Test on **staging first**, never directly on production
- Use TEST orders where possible
- Keep backup of production database
- Monitor for 24-48 hours after production deployment
- Check for any new "Unknown" orders appearing
