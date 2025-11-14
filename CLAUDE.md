# Claude Code Project Context

## Project Overview
**Name**: Urban Flower Farm (Buttons Flower Farm)
**Type**: E-commerce React application for local flower farm
**Last Updated**: 2025-11-13

## Tech Stack
- **Frontend**: React 17.0.2 with React Router v6
- **Backend**: Firebase (Realtime Database, Auth, Storage, Functions)
- **Deployment**: Firebase Hosting (staging and production)
- **Email**: SendGrid for order confirmations
- **Payments**: Stripe integration

## Key Features
1. **Shop**: Browse and purchase flowers with inventory management
2. **Admin Dashboard**: Order management, inventory control, news updates
3. **Order System**: Cart, checkout, email confirmations with invoices (includes GST/PST tax calculations)
4. **Authentication**: Firebase Auth with admin role management

## Recent Changes (2025-11-13)
- Added customer-visible notes for order edits:
  - New "Customer Message" field in OrderEditor (distinct from internal admin notes)
  - Yellow highlighted display in OrderDetails for customer visibility
  - Customer note appears on printed and emailed invoices
  - Included in both order confirmation and invoice email templates
  - Enables transparent communication when orders are modified
  - Stored as `customerNote` field in order data

## Previous Changes (2025-10-24)
- Fixed email invoice to include payment information:
  - Added Payment Information section with cash and e-transfer methods
  - Centered, compact layout matching on-screen invoice display
  - Includes order number reminder for payment notes
- Simplified order confirmation email:
  - Removed tax breakdown from customer email (shown on invoice instead)
  - Added section headers for mixed in-stock/pre-order items (READY FOR PICKUP / PRE-ORDER)
  - Simplified checkout page to show only total (taxes shown on invoice)
  - Added note about taxes being included on invoice

## Previous Changes (2025-10-21)
- Implemented Split Invoice System with Payment Tracking:
  - Three invoice buttons: In Stock Items, Pre-Order Items, All Items
  - Invoice number suffixes: -A (In Stock), -B (Pre-Order), none (All Items)
  - Discount application selector with options: all items, in-stock only, pre-order only, split proportionally
  - Invoice component respects discount applyTo setting and calculates discounts accordingly
  - Payment tracking checkboxes under each invoice button (Paid/Unpaid status)
  - Payment status stored separately in Firebase (orders/{id}/invoicePayments/{instock|preorder|all})
  - Inventory status enrichment for older orders missing the field
  - Case-insensitive filtering for inventory status
  - Simplified order confirmation email (removed payment box, added one-line text)
  - Optimized UI spacing in Order Totals section

## Previous Changes (2025-10-10)
- Fixed order row total calculation and invoice printing:
  - OrderTableRow now recalculates taxes on discounted amount (not stored values)
  - Added comprehensive print styles to hide navbar, feedback button, and footer
  - Invoice prints cleanly on single page without blank pages
  - Print media queries ensure zero spacing from hidden elements

## Previous Changes (2025-10-08)
- Implemented Canadian Sales Tax (GST/PST) System:
  - GST: 5%, PST: 7% (Total: 12%)
  - Tax calculation methods in CartContext (getGST, getPST, getTotal)
  - CartModal displays subtotal only (tax shown at checkout)
  - Full tax breakdown on Checkout, Order Confirmation, and My Orders pages
  - Email templates include tax rows (customer, admin, invoice)
  - Invoice component calculates taxes for both HTML and PDF
  - OrderEditor recalculates taxes when orders are modified
  - OrderDetails and OrderTableRow display correct totals including taxes
  - Order data structure now includes: subtotal, gst, pst, total fields

## Previous Changes (2025-09-12)
- Fixed and improved master database import/export:
  - Smart mode only processes rows with explicit update_mode values (blank rows skipped)
  - Fixed inventory field mappings (currentStock instead of inventoryCount)
  - Fixed boolean consistency (lowercase true/false instead of TRUE/FALSE)
  - Simplified update_mode values to: add, update, hide
  - Filters undefined values to prevent Firebase validation errors
  - Inventory updates now work for all plants (not just new ones)
  - Cleaned up UI - removed redundant JSON backup and CSV reference sections
  - Streamlined import page with simple tip box

## Previous Changes (2025-09-11)
- Unified Master Database Spreadsheet System:
  - Single spreadsheet contains all plant and inventory data
  - Export current database as master spreadsheet for editing
  - Update_mode column controls each row's action
  - Simplified import to single file upload
  - Export-edit-import workflow for data consistency
  - Addresses potential conflicts by encouraging export before edit

## Previous Changes (2025-09-09)
- Simplified Import Interface:
  - Removed redundant "Update Stock Levels" tab - now unified under "Import / Update"
  - Separate templates for Plants and Inventory (cleaner, more focused)
  - Inventory template includes status dropdown (In Stock, Low Stock, Sold Out, Coming Soon, Pre-Order)
  - Plants file now optional when only updating inventory levels
- Enhanced CSV Import with Photo Credits:
  - Support for multiple images with individual photo credits
  - Direct Excel file upload support (.xlsx, .xls) - no CSV conversion needed
  - Google Sheets compatible - export as Excel and upload directly
  - New fields for main and additional images photo credits
  - Automatically converts to imageMetadata structure for attribution system
- Updated image attribution display format:
  - Replaced copyright symbol (©) with "Photo credit:" for clarity
  - Applied to PlantCard, PlantDetails, and ImageUploaderWithAttribution components
  - Removed year from photo credits as it's not needed
  - Consistent labeling across shop cards, detail pages, and editor

## Previous Changes (2025-09-08)
- Implemented Phase 1 Image Attribution System:
  - New ImageUploaderWithAttribution component for source tracking
  - Support for commercial sources (Van Noort, Jelitto, etc.)
  - Attribution metadata stored with each image
  - "Own photo" vs "Commercial source" selection
  - Optional watermarking for BUFF's own photos
  - Attribution display on shop cards and detail pages
  - Edit existing image attributions in plant editor

## Previous Changes (2025-08-19)
- Added inventory image URL editing:
  - Direct Firebase Storage URL input for plant images
  - Always-visible URL field in plant editor
  - Validation for Firebase Storage URLs only
  - "Upload URL" button to save image URLs
- Implemented freebie tracking:
  - Checkbox in order editor to mark items as freebies
  - Freebies excluded from order totals
  - Visual indicators: strikethrough price and "FREE" label
  - Plant Sales Tracker displays actual freebie counts
- Added "My Orders" link to customer navigation menu
- Previous changes (2025-08-18):
  - Added Coming Soon enhancements:
    - Order confirmation emails show "(Coming Soon)" indicator for applicable items
    - Checkout displays warning message when cart contains Coming Soon items
    - Required checkbox acknowledgment before ordering Coming Soon items
    - Visual badges on Coming Soon items in order summary
  - Added new plant characteristic fields:
    - Planting Season
    - Planting Depth (in inches)
    - Mature Size
  - Updated CSV import to support new plant fields
  - Redesigned News page with stacked collapsible layout matching How-To page
  - Added pin functionality for news items (limited to one pinned item)
  - Implemented preview text with ellipsis for long content
  - Added "Read more" links on homepage for truncated news
  - Updated admin news view to match customer view
  - Enhanced pinned news on homepage (200 char preview, inline expansion)
  - Renamed FAQ to How-To throughout the application
  - Updated all pickup location references from "farm" to "shop"
  - Updated Contact page social media links
  - Added Instagram icon and link to social media section
  - Fixed social media icons layout and styling
- Previous changes (2025-08-05):
  - Fixed news creation permissions in Firebase rules
  - Added discount itemization to order confirmation emails
  - Implemented admin notes system for order management
  - Enhanced shop sorting with plant type filters
  - Fixed mobile alignment for admin notes display

## Project Structure
```
/src
  /components
    /orders      # Order management components
    /inventory   # Inventory management
    /plant-editor # Plant editing interface
  /services
    firebase.js  # Firebase configuration and helpers
  /context       # React context providers
/functions       # Firebase Cloud Functions
/public          # Static assets
```

## Development Workflow
1. **Branches**: 
   - `main` (production)
   - `working-build` (pre-production)
   - `staging` (testing)
   - `development` (active development)

2. **Deploy Commands** - IMPORTANT SAFETY RULES:
   - **NEVER use `firebase deploy` directly** - it deploys to both environments!
   - **Safe staging deploy**: `./deploy.sh staging` or `npm run deploy:staging`
   - **Maintenance page**: `./deploy.sh maintenance`  
   - **Production deploy** (with double confirmation): `./deploy.sh production`
   - **Functions only**: `./deploy.sh functions`
   - **Build locally**: `npm run build`
   - **Test locally**: `npm start`
   - **Emergency restore maintenance**: `./deploy.sh maintenance`

## Important Notes
- **Authentication**: No anonymous auth - admin sign-in required
- **Images**: Must use Firebase Storage URLs, not local paths
- **Orders**: Email confirmations sent automatically on order creation
- **Database**: Using Firebase Realtime Database (not Firestore for main data)

## Common Tasks
- Run tests: `npm test`
- Update inventory: Through Admin Dashboard > Inventory
- Add news: Admin Dashboard > Updates
- Process orders: Admin Dashboard > Orders

## Environment Variables Required
- Firebase configuration (API keys, project ID, etc.)
- SendGrid API key
- Stripe keys

## Known Issues
- React Router v7 warnings (can be ignored)
- Node.js 18 deprecation warning in Firebase Functions