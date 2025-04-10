const {Storage} = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

async function setCors() {
  // The ID of your GCS bucket
  const bucketName = 'buttonsflowerfarm-8a54d.appspot.com';

  // Creates a client
  const storage = new Storage();

  const corsConfiguration = [
    {
      origin: ["https://buttonsflowerfarm-8a54d.web.app", "https://urban-flower-farm-staging.web.app", "http://localhost:3000"],
      method: ["GET", "PUT", "POST", "DELETE", "HEAD"],
      maxAgeSeconds: 3600
    }
  ];

  await storage.bucket(bucketName).setCorsConfiguration(corsConfiguration);

  console.log(`CORS settings updated for ${bucketName}`);
}

setCors().catch(console.error); 