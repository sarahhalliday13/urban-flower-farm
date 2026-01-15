# Order Data Recovery Instructions

## Issue Summary
Due to a bug in the `updateOrder` function, 4 orders had their data accidentally deleted when payment information was updated. The bug has been **FIXED** (changed from `set()` to `update()` in firebase.js).

## Affected Orders
1. **ORD-2025-1001-1223** - Payment updated: Dec 4, 2025
2. **ORD-2025-1001-4144** - Payment updated: Nov 6, 2025
3. **ORD-2025-1001-7629** - Payment updated: Nov 14, 2025
4. **ORD-2025-1084-7811** - **Email sent!** (Nov 2, 2025) - Has Message ID: `aa5ded38-bce4-2dc4-a983-7b4ca5e9d75b@telus.net`

## Recovery Method 1: Gmail Sent Folder (EASIEST)

Since order confirmation emails are sent via Gmail (`buttonsflowerfarm@telus.net`), they should be in the **Sent** folder:

### Steps:
1. Log into Gmail at `buttonsflowerfarm@telus.net`
2. Go to **Sent** folder
3. Search for each order number:
   - Search: `subject:ORD-2025-1084-7811`
   - Search: `subject:ORD-2025-1001-1223`
   - Search: `subject:ORD-2025-1001-4144`
   - Search: `subject:ORD-2025-1001-7629`
4. Forward the found emails to yourself or save them
5. Extract the order information from the emails:
   - Customer name, email, phone
   - Items ordered (name, quantity, price)
   - Subtotal, GST, PST, Total
   - Pickup request details

### What to look for in emails:
- **Subject line**: "Order Confirmation - ORD-XXXX-XXXX-XXXX"
- **Date range to check**:
  - ORD-2025-1001-1223: Around Nov 4, 2025
  - ORD-2025-1001-4144: Around Oct 6, 2025
  - ORD-2025-1001-7629: Around Oct 14, 2025
  - ORD-2025-1084-7811: Around Nov 2, 2025

## Recovery Method 2: Check Customer Emails

If Bernie forwarded order confirmations to customers, ask those customers to forward their confirmation emails back. The emails contain all the order details.

## Recovery Method 3: Firebase Cloud Functions Logs (If recent enough)

```bash
# Check logs for recent orders
firebase functions:log --limit 2000 --only sendOrderEmail

# Look for lines like:
# "📦 Received order data: ORD-XXXX-XXXX-XXXX"
# The full order data should be in the logs around those lines
```

## After Recovery: Restoring to Firebase

Once you have the order data from emails, I can help you create a script to restore the orders to Firebase with the correct data structure.

### Required Order Data Structure:
```json
{
  "id": "ORD-2025-XXXX-XXXX",
  "date": "2025-XX-XXTXX:XX:XX.XXXZ",
  "status": "pending" or "processing",
  "customer": {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "pickupRequest": "",
    "notes": ""
  },
  "items": [
    {
      "id": "",
      "name": "",
      "price": 0.00,
      "quantity": 1,
      "inventoryStatus": "In Stock" or "Pre-Order",
      "isFreebie": false
    }
  ],
  "subtotal": 0.00,
  "gst": 0.00,
  "pst": 0.00,
  "total": 0.00,
  "payment": {
    "method": "cash" or "e-transfer",
    "timing": "paid-on-pickup" or "paid-in-advance"
  },
  "emailSent": true,
  "emailSentTimestamp": 1234567890
}
```

## Prevention
The bug has been FIXED in `src/services/firebase.js` line 1889:
- **Before**: `await set(orderRef, orderData);` (REPLACES entire order)
- **After**: `await update(orderRef, orderData);` (MERGES data)

This ensures that updating payment info will never delete order data again.

## Next Steps
1. Bernie should check Gmail sent folder first (easiest method)
2. Once emails are found, extract order data
3. We can create a restoration script to push the recovered data back to Firebase
4. Verify the restored orders appear correctly in the admin dashboard
