require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { exec } = require('child_process');

// Firebase configuration
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

// Function to configure CORS
const configureCors = () => {
  return new Promise((resolve, reject) => {
    console.log('Setting up CORS for Firebase Storage...');
    
    // Get the storage bucket from environment variables
    const storageBucket = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET;
    
    if (!storageBucket) {
      return reject(new Error('Storage bucket not defined in environment variables'));
    }
    
    console.log(`Using storage bucket: gs://${storageBucket}`);
    
    // Command to set CORS configuration
    const command = `npx gsutil cors set cors-config.json gs://${storageBucket}`;
    
    console.log(`Running command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error setting CORS:', error);
        console.error('If you don\'t have gsutil installed, follow these steps manually:');
        console.error('1. Go to your Firebase Console: https://console.firebase.google.com/');
        console.error('2. Navigate to Storage > Rules');
        console.error('3. Add CORS configuration to allow access from your site');
        
        // We resolve instead of reject, as we want the script to continue with uploads
        resolve({
          success: false,
          message: 'CORS setup failed. Please set up manually.',
          error: error.message
        });
        return;
      }
      
      console.log('CORS setup output:', stdout);
      
      if (stderr) {
        console.warn('CORS setup warnings:', stderr);
      }
      
      resolve({
        success: true,
        message: 'CORS configured successfully for Firebase Storage'
      });
    });
  });
};

// Function to upload a file to Firebase Storage
const uploadFile = async (filePath, destination) => {
  try {
    console.log(`Uploading file: ${filePath} to ${destination}`);
    
    // Read file data
    const fileData = fs.readFileSync(filePath);
    
    // Create a storage reference
    const storageReference = ref(storage, destination);
    
    // Upload the file
    const snapshot = await uploadBytes(storageReference, fileData);
    console.log(`File ${filePath} uploaded successfully!`);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`Download URL: ${downloadURL}`);
    
    return {
      success: true,
      path: destination,
      url: downloadURL
    };
  } catch (error) {
    console.error(`Error uploading file ${filePath}:`, error);
    return {
      success: false,
      path: destination,
      error: error.message
    };
  }
};

// Function to upload Palmer's Beardtongue images
const uploadPalmersBeardtongueImages = async () => {
  const publicDir = path.resolve(__dirname, '../public');
  const imagesDir = path.join(publicDir, 'images');
  
  // List of Palmer's Beardtongue images to upload
  const images = [
    { file: 'penstemonpalmeri.jpg', destination: 'plant_images/penstemonpalmeri.jpg' },
    { file: 'penstemonpalmeri2.jpg', destination: 'plant_images/penstemonpalmeri2.jpg' },
    { file: 'penstemonpalmeri3.jpg', destination: 'plant_images/penstemonpalmeri3.jpg' },
    { file: 'penstemonpalmeri4.jpg', destination: 'plant_images/penstemonpalmeri4.jpg' },
    { file: 'penstemonpalmeri5.jpg', destination: 'plant_images/penstemonpalmeri5.jpg' }
  ];
  
  console.log('Starting upload of Palmer\'s Beardtongue images...');
  
  const results = [];
  
  for (const image of images) {
    const filePath = path.join(imagesDir, image.file);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      results.push({
        file: image.file,
        success: false,
        error: 'File not found'
      });
      continue;
    }
    
    // Upload file
    const result = await uploadFile(filePath, image.destination);
    results.push({
      file: image.file,
      ...result
    });
  }
  
  // Log summary
  console.log('\nUpload Summary:');
  console.log('-------------------');
  let successCount = 0;
  results.forEach(result => {
    if (result.success) {
      successCount++;
      console.log(`✅ ${result.file} - ${result.url}`);
    } else {
      console.log(`❌ ${result.file} - ${result.error}`);
    }
  });
  console.log(`-------------------`);
  console.log(`Total: ${results.length}, Successful: ${successCount}, Failed: ${results.length - successCount}`);
  
  return {
    success: successCount > 0,
    totalImages: results.length,
    successfulUploads: successCount,
    failedUploads: results.length - successCount,
    results
  };
};

// Main function
const main = async () => {
  try {
    console.log('Starting Firebase Storage setup...');
    
    // Configure CORS
    const corsResult = await configureCors();
    console.log(corsResult.message);
    
    // Upload Palmer's Beardtongue images
    const uploadResult = await uploadPalmersBeardtongueImages();
    
    if (uploadResult.success) {
      console.log('\nFirebase Storage setup completed successfully!');
      console.log(`Uploaded ${uploadResult.successfulUploads} out of ${uploadResult.totalImages} images.`);
      
      // Generate code to update the Firebase.js file
      console.log('\nTo update your firebase.js file, replace the Palmer\'s Beardtongue section with:');
      console.log(`
if (plant.name === "Palmer's Beardtongue") {
  return {
    ...plant,
    mainImage: "${uploadResult.results.find(r => r.file === 'penstemonpalmeri.jpg')?.url || ''}",
    additionalImages: [
      "${uploadResult.results.find(r => r.file === 'penstemonpalmeri2.jpg')?.url || ''}",
      "${uploadResult.results.find(r => r.file === 'penstemonpalmeri3.jpg')?.url || ''}",
      "${uploadResult.results.find(r => r.file === 'penstemonpalmeri4.jpg')?.url || ''}",
      "${uploadResult.results.find(r => r.file === 'penstemonpalmeri5.jpg')?.url || ''}"
    ]
  };
}
      `);
    } else {
      console.log('\nFirebase Storage setup partially completed.');
      console.log(`Uploaded ${uploadResult.successfulUploads} out of ${uploadResult.totalImages} images.`);
      console.log('Please check the errors above and try again for the failed uploads.');
    }
  } catch (error) {
    console.error('Error in Firebase Storage setup:', error);
  }
};

// Run the main function
main(); 