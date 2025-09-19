const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');
const giftCertificates = require('./gift_certificates_sample.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://urban-flower-farm-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

async function importGiftCertificates() {
  console.log('🎁 Starting gift certificate import...\n');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const cert of giftCertificates) {
    try {
      // Check if plant already exists
      const plantRef = db.ref(`plants/${cert.plant_id}`);
      const snapshot = await plantRef.once('value');
      
      if (snapshot.exists()) {
        console.log(`⏭️  Skipped ${cert.plant_id} - already exists`);
        skippedCount++;
        continue;
      }
      
      // Prepare plant data (remove update_mode field)
      const plantData = { ...cert };
      delete plantData.update_mode;
      delete plantData.inventory; // Inventory is stored separately
      
      // Set plant data
      await plantRef.set(plantData);
      console.log(`✅ Added ${cert.plant_id}: ${cert.name}`);
      
      // Check/update inventory if needed
      const invRef = db.ref(`inventory/${cert.plant_id}`);
      const invSnapshot = await invRef.once('value');
      
      if (!invSnapshot.exists() && cert.inventory) {
        await invRef.set(cert.inventory);
        console.log(`   📦 Added inventory for ${cert.plant_id}`);
      }
      
      successCount++;
    } catch (error) {
      console.error(`❌ Error importing ${cert.plant_id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log('=================');
  console.log(`✅ Successfully imported: ${successCount}`);
  console.log(`⏭️  Skipped (already exist): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  // Verify the import
  console.log('\n🔍 Verifying gift certificates in database...');
  
  const plantsRef = db.ref('plants');
  const plantsSnapshot = await plantsRef.once('value');
  const plants = plantsSnapshot.val() || {};
  
  const giftCertPlants = Object.entries(plants).filter(([id, plant]) => 
    id.startsWith('GC-') || plant.plantType === 'Gift Certificate'
  );
  
  console.log(`\n✅ Total gift certificates in database: ${giftCertPlants.length}`);
  
  if (giftCertPlants.length > 0) {
    console.log('\n📋 Gift Certificates Found:');
    giftCertPlants.forEach(([id, plant]) => {
      console.log(`  • ${id}: ${plant.name} - $${plant.price}`);
    });
  }
  
  process.exit(0);
}

importGiftCertificates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});