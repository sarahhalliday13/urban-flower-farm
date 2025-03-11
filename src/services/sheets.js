const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbw8STj53fmnI2DuiyhMwXLW3btLxJSC_rQH4YMhLADaw50Olkr8Y2-CcJ2Cr6IgZ0ZY/exec';

// Function to get all plants
export const fetchPlants = async () => {
  try {
    const response = await fetch(SHEETS_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch plants');
    }
    const data = await response.json();
    
    // Filter out empty entries and map the data to match our app's structure
    return data
      .filter(plant => plant.name) // Remove empty entries
      .map(plant => ({
        id: plant.id,
        name: plant.name,
        scientificName: plant.latinName,
        mainImage: plant.mainImage,
        price: plant.price.toString(),
        light: plant.light,
        water: "", // Not provided in the data
        care: "", // Not provided in the data
        description: plant.description,
        inventory: {
          currentStock: plant.availability === "Ready now" ? 1 : 0,
          status: plant.availability === "Ready now" ? "In Stock" : "Out of Stock"
        },
        // Additional fields from the sheet
        commonName: plant.commonName,
        bloomSeason: plant.bloomSeason,
        colour: plant.colour,
        spacing: plant.spacing,
        attributes: plant.attributes,
        hardinessZone: plant.hardinessZone,
        height: plant.height,
        additionalImages: plant.additionalImages ? plant.additionalImages.split(',').map(img => img.trim()) : []
      }));
  } catch (error) {
    console.error('Error fetching plants:', error);
    throw error;
  }
};

// Function to get a single plant by ID
export const fetchPlantById = async (id) => {
  try {
    const plants = await fetchPlants();
    return plants.find(plant => plant.id === parseInt(id));
  } catch (error) {
    console.error('Error fetching plant:', error);
    throw error;
  }
}; 