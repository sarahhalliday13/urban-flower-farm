import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchPlants, loadSamplePlants } from '../services/firebase';

// Create context
const AdminContext = createContext();

// Custom hook for using the admin context
export const useAdmin = () => useContext(AdminContext);

// Provider component
export const AdminProvider = ({ children }) => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Function to load plants data
  const loadPlants = useCallback(async (forceRefresh = false) => {
    // Use a ref to track current plants length to avoid dependency loop
    const currentPlantsLength = plants.length;
    
    // Skip if we already have data and force refresh is not requested
    if (currentPlantsLength > 0 && !forceRefresh) {
      return plants;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Create a timeout to handle cases where Firebase fetch hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase fetch timed out')), 8000);
      });
      
      // Try Firebase first
      const data = await Promise.race([
        fetchPlants(),
        timeoutPromise
      ]);
      
      let finalData = data;
      
      // If no data, try sample data
      if (!finalData || finalData.length === 0) {
        console.log('No plants found in Firebase, trying sample data');
        const sampleData = await loadSamplePlants();
        if (sampleData.length === 0) {
          throw new Error('No plants found');
        }
        finalData = sampleData;
      }
      
      setPlants(finalData);
      setLastUpdated(new Date());
      setLoading(false);
      return finalData;
    } catch (err) {
      console.error('Error fetching plants:', err);
      
      // Try sample data if Firebase fetch fails
      try {
        const sampleData = await loadSamplePlants();
        setPlants(sampleData);
        setLastUpdated(new Date());
        setLoading(false);
        return sampleData;
      } catch (sampleErr) {
        console.error('Failed to load sample data:', sampleErr);
        setError(`Failed to load plants: ${err.message}`);
        setLoading(false);
        return [];
      }
    }
  }, []); // Remove plants dependency to prevent infinite loops

  // Initial loading of plants data
  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  // Update plants data
  const updatePlantData = useCallback((updatedPlant) => {
    setPlants(currentPlants => {
      // Check if the plant already exists in the array
      const plantExists = currentPlants.some(plant => plant.id === updatedPlant.id);
      
      if (plantExists) {
        // Update existing plant
        return currentPlants.map(plant => 
          plant.id === updatedPlant.id ? { ...plant, ...updatedPlant } : plant
        );
      } else {
        // Add new plant
        return [...currentPlants, updatedPlant];
      }
    });
  }, []);

  return (
    <AdminContext.Provider value={{
      plants,
      loading,
      error,
      lastUpdated,
      loadPlants,
      updatePlantData
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContext; 