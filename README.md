# Plant Inventory App with Firebase

This application uses Firebase Realtime Database for inventory management. Follow these steps to set up Firebase for your project.

## Firebase Setup Instructions

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Give your project a name (e.g., "plant-inventory-app")
4. Enable Google Analytics if desired
5. Click "Create project"

### 2. Set Up Realtime Database

1. In your Firebase project console, click on "Build" in the left sidebar
2. Select "Realtime Database"
3. Click "Create Database" (you might see "Get started" instead of "Enable")
4. Choose a location (select the one closest to your users)
5. When prompted about security rules, select "Start in test mode"
6. Click "Next" and then "Create" to finish the setup

**Note:** If you don't see the option to create a database, try these alternatives:
- Look for a "+" button or "Add database" option
- Try refreshing the page or using a different browser
- Make sure you're in the correct project

### 3. Register Your Web App

1. In your Firebase project console, click on the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section and click the web icon (</>) 
4. Register your app with a nickname (e.g., "plant-inventory-web")
5. Click "Register app"
6. Copy the Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 4. Update Environment Variables

1. Open the `.env` file in your project
2. Replace the placeholder values with your actual Firebase configuration:

```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 5. Migrate Data from Google Sheets

1. Log in to your application
2. Navigate to the "Firebase Migration" page from the admin menu
3. Click "Start Migration" to import your data from Google Sheets to Firebase
4. Wait for the migration to complete

### 6. Secure Your Database (After Migration)

1. In your Firebase project console, go to "Realtime Database"
2. Click on the "Rules" tab
3. Update the rules to secure your database:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "plants": {
      ".read": true,  // Allow public read access to plants
      ".write": "auth != null"  // Only authenticated users can write
    },
    "inventory": {
      ".read": true,  // Allow public read access to inventory
      ".write": "auth != null"  // Only authenticated users can write
    }
  }
}
```

4. Click "Publish"

## Features

- Real-time inventory updates
- Offline support with local caching
- Secure data storage
- Improved reliability and performance over Google Sheets
- No CORS issues

## Troubleshooting

If you encounter any issues:

1. Check your Firebase configuration in the `.env` file
2. Ensure your Firebase project has Realtime Database enabled
3. Check the browser console for error messages
4. Verify your database rules are correctly set

## Development

To run the application locally:

```bash
npm install
npm start
```

## Deployment

To deploy the application:

```bash
npm run build
```

Then deploy the contents of the `build` folder to your hosting provider.

## Feature: Mobile Pagination

- Adds mobile-specific pagination visible only < 991px.
- Preserves desktop footer pagination.
- All params and scroll behavior retained.
