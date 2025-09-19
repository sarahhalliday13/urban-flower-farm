# Gift Certificate Setup Instructions

## Quick Setup
Gift certificates are now integrated into your shop as special inventory items. They'll display with unique styling and simplified details.

## Adding Gift Certificates to Your Shop

### Option 1: Via Master Spreadsheet (Recommended)
1. Download the current master database spreadsheet from Admin > Inventory > Export/Backup
2. Add the following rows with these exact values:

| plant_id | name | price | plantType | description | currentStock | status | update_mode |
|----------|------|-------|-----------|-------------|--------------|--------|-------------|
| GC-25 | Gift Certificate - $25 | 25.00 | Gift Certificate | This digital gift certificate will be emailed... | 999 | In Stock | add |
| GC-50 | Gift Certificate - $50 | 50.00 | Gift Certificate | This digital gift certificate will be emailed... | 999 | In Stock | add |
| GC-75 | Gift Certificate - $75 | 75.00 | Gift Certificate | This digital gift certificate will be emailed... | 999 | In Stock | add |
| GC-100 | Gift Certificate - $100 | 100.00 | Gift Certificate | This digital gift certificate will be emailed... | 999 | In Stock | add |
| GC-250 | Gift Certificate - $250 | 250.00 | Gift Certificate | This digital gift certificate will be emailed... | 999 | In Stock | add |

Full description text:
"This digital gift certificate will be emailed to you within 24 hours of purchase. To redeem, contact Buttons Flower Farm with your order number. The recipient can use this certificate toward any plants or products in our shop. No expiration date."

3. Save the spreadsheet
4. Go to Admin > Inventory > Import/Export
5. Import the updated spreadsheet using Smart Mode

### Option 2: Manual Entry
Use the Plant Editor to add each gift certificate as a new "plant" with:
- Plant Type: "Gift Certificate"
- High inventory count (e.g., 999)
- The description text above

## Gift Certificate Images
You'll need to upload gift certificate images to Firebase Storage. Consider creating:
- A generic gift certificate design with the farm logo
- Different colors or designs for each denomination (optional)
- Size: 800x800px recommended for consistency

## How Gift Certificates Display

### In the Shop:
- Special golden border and background
- "Digital Delivery" badge on the image
- "Gift Certificate" label instead of inventory status
- No photo attribution shown

### On Detail Page:
- Shows "Gift Certificate Details" instead of "Plant Specifications"
- Displays: Type (Digital Delivery), Value, Delivery time, Validity
- Includes redemption instructions from the description field
- No plant-specific fields (height, sunlight, etc.)

## Processing Gift Certificate Orders

When a customer orders a gift certificate:
1. They receive the standard order confirmation email
2. You'll need to manually email them the gift certificate details within 24 hours
3. Track the certificate code/number in your order notes
4. When someone redeems, manually process their plant order and note the certificate used

## Future Enhancements (Optional)
Consider adding later:
- Automated gift certificate email generation
- PDF certificate template
- Gift message field during checkout
- Certificate code tracking system
- Balance management for partial redemptions

## Testing
After adding gift certificates:
1. Check they appear correctly in the shop
2. Test adding to cart and checkout
3. Verify the detail page shows gift certificate information
4. Place a test order to ensure the process works

## Support
The gift certificates use the existing plant infrastructure, so all current features work:
- Inventory management
- Order processing  
- Sales tracking
- Export/import via spreadsheet

Remember to update gift certificate images seasonally or for special occasions!