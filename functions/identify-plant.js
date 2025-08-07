exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { imageUrl, organ = 'auto' } = JSON.parse(event.body);
    
    if (!imageUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image URL is required' })
      };
    }

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
    
    // Create form data
    const formData = new FormData();
    formData.append('images', imageBlob, 'plant.jpg');
    formData.append('organs', organ);
    
    // Call PlantNet API
    const apiKey = process.env.REACT_APP_PLANTNET_API_KEY || '2b10oApIxgDOhHA1qAxzcMZol';
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?include-related-images=false&no-reject=false&lang=en&api-key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PlantNet API error:', errorText);
      throw new Error(`PlantNet API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process results
    if (data.results && data.results.length > 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          results: data.results.slice(0, 3).map(result => ({
            scientificName: result.species.scientificNameWithoutAuthor,
            commonNames: result.species.commonNames || [],
            family: result.species.family.scientificNameWithoutAuthor,
            genus: result.species.genus.scientificNameWithoutAuthor,
            score: Math.round(result.score * 100)
          })),
          bestMatch: data.results[0]
        })
      };
    } else {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'No plant identification results found'
        })
      };
    }
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};