# 🛠️ Button's Flower Farm - Developer Guide

This guide is intended for developers working on the Button's Flower Farm e-commerce application. It covers the application setup, architecture, critical components, and common issues to be aware of.

## 📋 Table of Contents
- [Environment Setup](#environment-setup)
- [Project Structure](#project-structure)
- [Critical Components](#critical-components)
- [Email System](#email-system)
- [Admin Dashboard](#admin-dashboard)
- [Common Issues & Solutions](#common-issues--solutions)
- [Development Workflow](#development-workflow)
- [Testing](#testing)

## Environment Setup

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- Firebase CLI: `npm install -g firebase-tools`

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd plant_app
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   REACT_APP_FIREBASE_DATABASE_URL=your_firebase_database_url
   REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
   ```

   Also create a `.env` file in the `functions` directory:
   ```
   SENDGRID_API_KEY=your_sendgrid_api_key
   ```

4. **Set up Firebase Functions configuration**
   ```bash
   firebase login
   firebase functions:config:set sendgrid.api_key="your_sendgrid_api_key"
   ```

### Running Locally

1. **Start the React development server**
   ```bash
   npm start
   ```

2. **Start Firebase emulators**
   In a separate terminal:
   ```bash
   cd functions
   npm run serve
   ```

   **Note:** If you encounter port conflicts, you can modify the ports in `firebase.json`.

## Project Structure

```
plant_app/
├── build/                  # Production build output
├── functions/              # Firebase Cloud Functions
│   ├── index.js            # Main functions code
│   └── package.json        # Functions dependencies
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   ├── context/            # React context providers
│   ├── services/           # Service layer (Firebase, email, etc.)
│   ├── styles/             # CSS files
│   └── App.js              # Main application component
├── .env                    # Environment variables
├── .firebaserc             # Firebase project configuration
├── firebase.json           # Firebase configuration
├── package.json            # Project dependencies
├── DEVELOPER.md            # This guide
└── PROJECT_SUMMARY.md      # Project overview and history
```

## Critical Components

### `src/services/firebase.js`
Central point for Firebase initialization and utilities. Contains methods for database access, authentication, and storage operations.

### `src/services/emailService.js`
Handles sending emails through Firebase Functions. Includes fallback mechanisms when Firebase Functions are unavailable.

**IMPORTANT:** This file contains the logic for determining API URLs based on environment. The correct port mapping is critical.

### `functions/index.js`
Contains all Firebase Cloud Functions, including the email sending functions. Has specialized error handling for order data and notes.

**CRITICAL:** The `getOrderNotes()` function ensures customer notes are properly extracted from orders and displayed prominently in emails.

## Email System

The email system is one of the most critical components of the application. It has a primary and fallback mechanism:

### Primary System: Firebase Functions + SendGrid
- Uses SendGrid API to send emails
- Configured through Firebase Functions
- Sends both customer confirmation and admin notification emails

### Fallback System: localStorage Queue
- Used when Firebase Functions are unavailable
- Stores pending emails in `localStorage`
- Admin dashboard displays notifications for pending emails
- Allows manual sending through admin interface

### Common Email Issues

1. **Firebase Function Port Conflicts**
   - **Symptoms:** Emulator fails to start, connection refused errors
   - **Solution:** Kill processes using conflicting ports or modify port configuration in `firebase.json`

2. **SendGrid API Key Issues**
   - **Symptoms:** Error messages about missing API key
   - **Solution:** Verify API key is set in both Firebase config and `.env` file in functions directory

3. **Missing Notes in Emails**
   - **Symptoms:** Customer pickup notes don't appear in emails
   - **Solution:** Ensure the `getOrderNotes()` function is intact in `functions/index.js`

## Admin Dashboard

The Admin Dashboard provides real-time data on sales, inventory, and pending orders.

### Key Features
- **Sales Metrics:** Real-time calculation based on orders from Firebase
- **Low Stock Warning:** Highlights inventory items that need restocking
- **Pending Emails:** Shows orders with unsent confirmation emails
- **Manual Email Controls:** Allows resending emails that failed to send

### Implementation Details
- Uses Firebase real-time listeners for up-to-date data
- Implements proper cleanup to prevent memory leaks
- Falls back to localStorage data when Firebase is unavailable

### Common Dashboard Issues

1. **Memory Leaks**
   - **Symptoms:** React warning about state updates on unmounted components
   - **Solution:** Ensure all Firebase listeners are properly detached in useEffect cleanup

2. **Stale Data**
   - **Symptoms:** Dashboard shows outdated information
   - **Solution:** Use the refresh button or check the Firebase listener implementation

## Common Issues & Solutions

### Firebase Emulator Port Conflicts
```bash
# Check for processes using specific ports
lsof -i :4003,4400,4500 | grep LISTEN

# Kill specific process
kill -9 <PID>

# Alternative: Change ports in firebase.json
```

### React Memory Leaks
Always use cleanup functions in useEffect hooks:
```javascript
useEffect(() => {
  let isMounted = true;
  // Set up listeners...
  
  return () => {
    isMounted = false;
    // Clean up listeners...
  };
}, []);
```

### Email Testing
```bash
# Start emulators
firebase emulators:start --only functions

# Create a test script
node functions/test-email.js
```

## Development Workflow

1. **Create a feature branch from `development`**
   ```bash
   git checkout development
   git pull
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test thoroughly**
   - Test all affected functionality
   - Pay special attention to email functionality and admin dashboard

3. **Run the build process**
   ```bash
   npm run build
   ```

4. **Test the production build**
   ```bash
   npx serve -s build
   ```

5. **Create a pull request to `development`**
   - Include detailed description of changes
   - Note any potential impact on critical systems

6. **After approval, merge to `development`**

7. **For production deployment, merge `development` to `working-build`**

## Testing

### Manual Testing Checklist

**Order Flow:**
- [ ] Add items to cart
- [ ] Complete checkout
- [ ] Verify order appears in Firebase
- [ ] Verify confirmation email is sent
- [ ] Verify notes appear prominently in emails

**Admin Dashboard:**
- [ ] Verify sales metrics are accurate
- [ ] Test order status changes
- [ ] Test manual email sending
- [ ] Verify inventory updates

### Automated Testing
Currently, the project doesn't have automated tests. If implementing tests, focus on:
- Order submission flow
- Email sending functionality
- Admin dashboard data fetching

## Firebase Functions Deployment

To deploy only the Firebase Functions:
```bash
firebase deploy --only functions
```

To deploy the entire application:
```bash
npm run build
firebase deploy
```

---

## ⚠️ Critical Reminders

1. **NEVER remove the notes handling in email templates** - critical for customer pickup requests
2. **ALWAYS clean up Firebase listeners** to prevent memory leaks
3. **NEVER hardcode API keys** in client-side code
4. **ALWAYS test email functionality** after making changes to related components

---

For more detailed information about the project history and recent fixes, see `PROJECT_SUMMARY.md`. 