# 🌸 Button's Flower Farm - Project Summary

## 🛠 Project Overview
- React-based e-commerce site for a flower farm  
- Uses **Firebase** for backend (database, authentication) and **hosting**  
- Formerly deployed on Netlify — now fully migrated to **Firebase Hosting**  
- **Production branch**: `working-build`  
- **Feature development branch**: `development`

---

## 🚀 Deployment Setup
- **Firebase Hosting** is now used for both frontend and functions
- **Hosting Build Command**: `npm run build`  
- **Firebase Functions**: deployed with `firebase deploy --only functions`
- **Hosting Deploy**: run `firebase deploy` or `firebase deploy --only hosting`

---

## ⚠️ IMPORTANT RULES FOR DEV MONKEYS

### 🚫 DO NOT MAKE UNAUTHORIZED CHANGES TO:
1. 🧱 **Layouts** – product/shop/site structure is FINAL  
2. 🎨 **Styling** – all CSS changes need explicit approval  
3. 🧩 **Components** – no refactoring working components  
4. 📦 **Dependencies** – do not add new libraries without approval  

### 🧠 ALWAYS ASK BEFORE:
- Making visual/UI changes  
- "Modernizing" components or styles  
- Refactoring any code  
- Modifying build, config, or deployment files  

> ❗ If you're not sure, ask. Unauthorized changes = instability, bugs, and rollbacks. Repeated violations = removal from the repo.

---

## 🔐 SECURITY — DO NOT EXPOSE API KEYS

### 🚫 NEVER:
- Hardcode **API keys**, secrets, or tokens into client-side code  
- Commit `.env` or config files with secrets  
- Use `process.env` in frontend logic (it's visible in the browser)

### ✅ INSTEAD:
- Use environment variables (`.env.local`, Firebase config)  
- Keep secrets **server-side only** (e.g., in Firebase functions)  
- Double-check PRs before merging  
- Revoke any key that is accidentally committed

---

## ✅ TypeScript Removal — COMPLETE

- Removed in March 2025 due to build issues  
- Improved IDE performance and deployment stability  
- Current production bundle: `main.438649a8.chunk.js`  
- 🚫 **Do not add back** any `.ts` or `.tsx` files

---

## 🧯 Recent Issues & Fixes

### 1. Firebase / CORS Errors

**Symptoms:**  
- CSP violations  
- CORS errors  
- Timeouts during DB/auth requests  

**Fixes:**  
- `firebase-fix-for-app.js`: Core fix for headers  
- `firebase-cors-build.js`: Custom build runner  
- `inject-firebase-fix.js`: HTML patcher  
- WebSocket compatibility fix

### 2. Email Function Issues (Updated April 2025)

The email functionality has been significantly improved with the following enhancements:

1. **Backend Email Handling Improvements**:
   - Implemented robust error handling to prevent crashes with partial order data
   - Added detailed logging to help diagnose email delivery issues
   - Created a dedicated `getOrderNotes()` function to ensure customer notes are always captured
   - Enhanced email templates with more prominent notes display for better customer service
   - Added visual styling to make pickup request notes stand out in both customer and admin emails

2. **Frontend Email Service**:
   - Updated `emailService.js` to correctly detect local vs production environments
   - Fixed port configuration for local testing with Firebase emulators
   - Implemented more robust fallback mechanisms when API calls fail
   - Enhanced error reporting for easier debugging

3. **Firebase Fixes**:
   - Properly configured emulator ports to prevent conflicts
   - Fixed memory leaks in the admin dashboard component that were preventing proper component cleanup
   - Improved Firebase listener detachment when components unmount

4. **Admin Dashboard Improvements**:
   - Fixed sales metrics calculation to use Firebase as the primary data source
   - Added real-time listeners for orders to ensure up-to-date information
   - Implemented proper loading states to prevent calculation errors
   - Added a manual refresh button to force data reload from Firebase
   - Added comprehensive error handling and fallback to localStorage when Firebase is unavailable

**Current Status**: Fixed and Enhanced ✅

All email functions are now working correctly with these improvements:
- Emails are reliably sent through Firebase Functions
- Customer notes/pickup requests are prominently displayed in emails
- System gracefully handles missing or malformed data
- Admin dashboard shows accurate real-time data
- Improved error handling with detailed logging

### 3. Memory Leak in AdminDashboard

**Symptoms:**
- React warning: "Can't perform a React state update on an unmounted component"
- Email functions failing due to lingering Firebase listeners
- State updates after component unmount causing errors

**Fixes:**
- Added proper cleanup for Firebase listeners in useEffect hooks
- Implemented isMounted flag to prevent state updates after unmount
- Restructured callback handling for better memory management
- Added safety checks to prevent operations on unmounted components

**Current Status**: Fixed ✅

---

## 📧 Order Process & Email System

### Order Flow
1. Customer adds products to cart
2. Customer proceeds to checkout and enters details
3. On submission, the system:
   - Generates unique order ID
   - Saves order to localStorage
   - Attempts to save order to Firebase database
   - Dispatches `orderCreated` event
   - Attempts to send confirmation emails
   - Redirects to order confirmation page

### Email System Architecture
- **Primary Method**: Firebase Functions + SendGrid
  - Function: `sendOrderEmail` in `functions/index.js`
  - Sends two emails per order:
    - Customer confirmation email
    - Admin notification email
  
- **Status**: Fixed and operational ✅
  
- **Fallback System**: localStorage-based queue (for backup only)
  - Orders requiring emails stored in `pendingOrderEmails`
  - Admin interface tracks emails in `manualEmails`
  - Admin dashboard displays warning when emails need sending
  - Admin can manually trigger emails from Orders page

### Email Troubleshooting
1. Check Firebase Functions logs for specific errors
2. Verify SendGrid API key is properly configured:
   - Should be set in Firebase config: `firebase functions:config:set sendgrid.api_key="YOUR_API_KEY"`
   - Check logs for "SendGrid API key is not defined" errors
3. Test email sending through Firebase CLI: `firebase functions:shell`
4. Ensure CORS settings are properly configured for API endpoints

### Email Issue Resolution (April 2025)

The email functionality issues were successfully resolved with the following changes:

1. **Express App Configuration**:
   - Separated Express apps for each endpoint
   - Removed conflicting calls to `app.listen()`
   - Fixed endpoint handlers at the root path for each function

2. **Port Configuration**:
   - Updated `firebase.json` to use different ports for emulators
   - Fixed port allocation in Firebase emulator configuration

3. **SendGrid API Key**:
   - Properly configured in `.env` file for development/testing
   - Added validation for API key loading from Firebase config or environment variables

4. **Testing**:
   - Created comprehensive test script to verify email functionality
   - All functions (general, order, contact) fully tested and operational

The current fallback system using localStorage remains as a backup measure, though the Firebase Functions are now the primary and functional email delivery mechanism.

### Admin Email Management
- Admin dashboard shows pending emails with warning icon
- Admin Orders page has Email Management section
- Admins can send/resend emails manually with status tracking
- Toast notifications confirm when emails are sent successfully

---

## 🌿 Branch Structure

- `working-build`: 🚀 Production (deployed to Firebase Hosting)  
- `development`: 🌱 New features (merge into `working-build`)  
- `no-typescript-dev`: 🪓 Deprecated, merged into production

---

## 📦 Deployment Workflow

1. Make changes on `development`  
2. Run `npm run build` to generate frontend build  
3. Deploy functions (if needed): `firebase deploy --only functions`  
4. Deploy site: `firebase deploy`  
5. Confirm success on [Firebase Console](https://console.firebase.google.com)

---

## 📁 Key Files

- `firebase-fix-for-app.js` — CORS/CSP fix  
- `firebase-cors-build.js` — Former build script (can be deprecated)  
- `inject-firebase-fix.js` — HTML patcher (if needed)  
- `firebase.json` — Firebase hosting + function rules  
- `.firebaserc` — Project environment config

---

## 🔧 Core Dependencies

- React `16.14.0`  
- Firebase `11.4.0`  
- Node `>=18.17.0`  
- NPM `>=9.0.0`

---

## 📝 Notes

- All production deployments now go through **Firebase Hosting**  
- Firebase Functions are used for contact/order form email handling  
- Keep secrets and sensitive logic **server-side**  
- Monitor Firebase console for logs, errors, and usage  
- ✅ Security and stability are priority #1  
