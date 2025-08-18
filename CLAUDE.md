# Claude Code Project Context

## Project Overview
**Name**: Urban Flower Farm (Buttons Flower Farm)
**Type**: E-commerce React application for local flower farm
**Last Updated**: 2025-08-05

## Tech Stack
- **Frontend**: React 17.0.2 with React Router v6
- **Backend**: Firebase (Realtime Database, Auth, Storage, Functions)
- **Deployment**: Firebase Hosting (staging and production)
- **Email**: SendGrid for order confirmations
- **Payments**: Stripe integration

## Key Features
1. **Shop**: Browse and purchase flowers with inventory management
2. **Admin Dashboard**: Order management, inventory control, news updates
3. **Order System**: Cart, checkout, email confirmations with invoices
4. **Authentication**: Firebase Auth with admin role management

## Recent Changes (2025-08-18)
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

2. **Deploy Commands**:
   - Build: `npm run build`
   - Deploy staging: `firebase deploy`
   - Test locally: `npm start`

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