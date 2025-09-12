// Debug script to analyze photo credits for specific plants
// Run this in the browser console when viewing the shop

console.log('🔍 Starting photo credit analysis for plants 46, 381, and 382');

// Function to create safe key like the app does
const createSafeKey = (url) => {
  return url.replace(/[.#$\[\]/]/g, '_');
};

// Function to analyze a plant's photo credit structure
const analyzePlant = (plant) => {
  const plantId = plant.id;
  const analysis = {
    id: plantId,
    name: plant.name,
    mainImage: plant.mainImage,
    hasImageMetadata: !!plant.imageMetadata,
    imageMetadataKeys: plant.imageMetadata ? Object.keys(plant.imageMetadata) : [],
    photoCreditsWork: false,
    issues: []
  };
  
  if (!plant.mainImage) {
    analysis.issues.push('No mainImage found');
    return analysis;
  }
  
  if (!plant.imageMetadata) {
    analysis.issues.push('No imageMetadata object found');
    return analysis;
  }
  
  // Check both safe key and original URL
  const safeKey = createSafeKey(plant.mainImage);
  const metadataFromSafeKey = plant.imageMetadata[safeKey];
  const metadataFromOriginalUrl = plant.imageMetadata[plant.mainImage];
  
  analysis.safeKey = safeKey;
  analysis.metadataFromSafeKey = metadataFromSafeKey;
  analysis.metadataFromOriginalUrl = metadataFromOriginalUrl;
  
  const metadata = metadataFromSafeKey || metadataFromOriginalUrl;
  
  if (!metadata) {
    analysis.issues.push('No metadata found for mainImage (neither safe key nor original URL)');
    analysis.issues.push(`Safe key: "${safeKey}"`);
    analysis.issues.push(`Available keys: ${Object.keys(plant.imageMetadata).join(', ')}`);
    return analysis;
  }
  
  // Check if metadata structure is correct
  if (!metadata.type) {
    analysis.issues.push('Metadata missing "type" field');
  }
  
  if (metadata.type === 'commercial') {
    if (!metadata.source || !metadata.source.name) {
      analysis.issues.push('Commercial type metadata missing source.name');
    } else {
      analysis.photoCreditsWork = true;
      analysis.creditText = `Photo credit: ${metadata.source.name}`;
    }
  } else if (metadata.type === 'own') {
    if (metadata.photographer) {
      analysis.photoCreditsWork = true;
      analysis.creditText = `Photo credit: ${metadata.photographer}`;
    } else if (metadata.watermarked) {
      analysis.photoCreditsWork = true;
      analysis.creditText = `Photo credit: Button's Flower Farm`;
    } else {
      analysis.issues.push('Own type metadata missing photographer or watermarked flag');
    }
  }
  
  return analysis;
};

// Get plants from window if available (assumes shop page is loaded)
if (window.plantsData || window.plants) {
  const plants = window.plantsData || window.plants;
  const targetPlants = plants.filter(p => [46, 381, 382].includes(Number(p.id)));
  
  if (targetPlants.length === 0) {
    console.log('❌ No plants found with IDs 46, 381, or 382');
    console.log('Available plant IDs:', plants.map(p => p.id).slice(0, 20));
  } else {
    console.log(`📊 Analyzing ${targetPlants.length} target plants:`);
    targetPlants.forEach(plant => {
      const analysis = analyzePlant(plant);
      console.group(`🌱 Plant ${analysis.id}: ${analysis.name}`);
      console.log('Works:', analysis.photoCreditsWork ? '✅' : '❌');
      if (analysis.photoCreditsWork) {
        console.log('Credit text:', analysis.creditText);
      }
      if (analysis.issues.length > 0) {
        console.log('Issues:', analysis.issues);
      }
      console.log('Main image:', analysis.mainImage);
      console.log('Has imageMetadata:', analysis.hasImageMetadata);
      console.log('ImageMetadata keys:', analysis.imageMetadataKeys);
      console.log('Safe key:', analysis.safeKey);
      console.log('Metadata from safe key:', analysis.metadataFromSafeKey);
      console.log('Metadata from original URL:', analysis.metadataFromOriginalUrl);
      console.groupEnd();
    });
  }
} else {
  console.log('❌ Plants data not available in window. Please run this on the shop page.');
  console.log('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('plant')));
}

// Instructions for manual analysis
console.log(`
📋 Manual Analysis Instructions:
1. If plants data isn't available, go to the shop page
2. In the shop page console, run: window.plantsData = plants (if plants variable exists)
3. Then re-run this script

🔍 What to check in the spreadsheet:
- main_credit_type column for plants 46, 381, 382
- main_credit_source column for these plants  
- mainimage column to see if URLs are different formats
- Look for special characters, extra spaces, or formatting issues

💡 Common issues:
1. main_credit_type is empty or "none"
2. main_credit_source is empty for commercial types
3. mainimage URL doesn't match the safe key format used in imageMetadata
4. Case sensitivity issues (should be lowercase)
5. Extra spaces or special characters in the data
`);