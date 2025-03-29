/// <reference types="react-scripts" />

// Define global window object with Firebase
interface Window {
  firebase?: any;
  FIREBASE_DEBUG?: any;
  FIREBASE_CONFIG?: any;
  checkFirebaseConnectivity?: () => any;
  initializeFirebaseManually?: () => void;
  mockFirebaseResponse?: () => void;
}

// Make TypeScript happy about importing images
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif'; 