// Script to upload plant images to Firebase Storage
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";
import fs from 'fs';
import path from 'path';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Function to upload a file to Firebase Storage
const uploadFile = async (filePath, storagePath) => {
  try {
    console.log(`Uploading ${filePath} to ${storagePath}...`);
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create a reference to the storage location
    const fileRef = storageRef(storage, storagePath);
    
    // Upload the file
    await uploadBytes(fileRef, fileBuffer);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(fileRef);
    
    console.log(`Upload success! Download URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error);
    throw error;
  }
};

// Main function to upload plant images
const uploadPlantImages = async () => {
  const images = [
    { 
      file: 'penstemonpalmeri.jpg',
      path: 'plant_images/penstemonpalmeri.jpg'
    },
    { 
      file: 'penstemonpalmeri2.jpg',
      path: 'plant_images/penstemonpalmeri2.jpg'
    },
    { 
      file: 'penstemonpalmeri3.jpg',
      path: 'plant_images/penstemonpalmeri3.jpg'
    },
    { 
      file: 'penstemonpalmeri4.jpg',
      path: 'plant_images/penstemonpalmeri4.jpg'
    },
    { 
      file: 'penstemonpalmeri5.jpg',
      path: 'plant_images/penstemonpalmeri5.jpg'
    }
  ];

  try {
    for (const image of images) {
      const filePath = path.join(process.cwd(), 'public', 'images', image.file);
      await uploadFile(filePath, image.path);
    }
    console.log('All images uploaded successfully!');
  } catch (error) {
    console.error('Error in upload process:', error);
  }
};

// Run the upload function
uploadPlantImages(); 