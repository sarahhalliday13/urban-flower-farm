const PLANTNET_API_KEY = process.env.REACT_APP_PLANTNET_API_KEY;
const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify';

export const identifyPlant = async (imageUrl, organ = 'auto') => {
  try {
    console.log('Identifying plant with URL:', imageUrl);
    console.log('Using organ:', organ);
    
    // Always use direct API call since we're not using Netlify
    // Development - try direct API call
      // First, we need to fetch the image as a blob
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image from Firebase');
      }
      
      const imageBlob = await imageResponse.blob();
      console.log('Image blob size:', imageBlob.size);
      
      // Create form data
      const formData = new FormData();
      formData.append('images', imageBlob, 'plant.jpg');
      formData.append('organs', organ);
      
      // Make the API call - using the correct project name format
      const apiUrl = `${PLANTNET_API_URL}/all?include-related-images=false&no-reject=false&lang=en&api-key=${PLANTNET_API_KEY}`;
      console.log('API URL:', apiUrl.replace(PLANTNET_API_KEY, 'API_KEY_HIDDEN'));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`PlantNet API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
    
    // Extract the most relevant results
    if (data.results && data.results.length > 0) {
      return {
        success: true,
        results: data.results.slice(0, 3).map(result => ({
          scientificName: result.species.scientificNameWithoutAuthor,
          commonNames: result.species.commonNames || [],
          family: result.species.family.scientificNameWithoutAuthor,
          genus: result.species.genus.scientificNameWithoutAuthor,
          score: Math.round(result.score * 100) // Convert to percentage
        })),
        bestMatch: data.results[0]
      };
    } else {
      return {
        success: false,
        message: 'No plant identification results found'
      };
    }
  } catch (error) {
    console.error('PlantNet API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper to determine plant organ from filename or context
export const detectPlantOrgan = (filename) => {
  const lowerName = filename.toLowerCase();
  
  if (lowerName.includes('flower') || lowerName.includes('bloom')) {
    return 'flower';
  } else if (lowerName.includes('leaf') || lowerName.includes('leaves')) {
    return 'leaf';
  } else if (lowerName.includes('fruit') || lowerName.includes('seed')) {
    return 'fruit';
  } else if (lowerName.includes('bark') || lowerName.includes('trunk')) {
    return 'bark';
  }
  
  // Default to auto detection
  return 'auto';
};