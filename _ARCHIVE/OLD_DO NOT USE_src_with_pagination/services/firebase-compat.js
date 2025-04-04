// Firebase Compatibility Shim
// This file creates a dummy firebase object for build process compatibility

// Create a dummy firebase object to prevent 'firebase is not defined' errors during build
const firebase = {
  app: () => ({
    options: {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "dummy-key",
      databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "dummy-url",
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "dummy-project",
    }
  }),
  database: () => ({
    ref: (path) => ({
      toString: () => `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/${path}`,
      on: (event, callback) => callback({ val: () => false }),
    })
  }),
  initializeApp: () => ({})
};

export default firebase; 