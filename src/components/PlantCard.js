import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './PlantCard.css';

const PlantCard = ({ plant }) => {
  const [imageError, setImageError] = useState(false);
  
  // Create a safe key from URL for Firebase (replace dots and slashes)
  const createSafeKey = (url) => {
    return url.replace(/[.#$\[\]/]/g, '_');
  };
  
  // Get image attribution text from inventory data
  const getImageAttribution = () => {
    if (!plant.inventory || !plant.mainImage) return null;
    
    const creditType = plant.inventory.mainCreditType;
    const creditSource = plant.inventory.mainCreditSource;
    
    // Debug logging
    if (plant.name && plant.name.includes('Plant')) {  // Log for a specific plant for debugging
      console.log(`[PlantCard] ${plant.name} - creditType: "${creditType}", creditSource: "${creditSource}"`);
    }
    
    if (!creditType || creditType === '') {
      return null; // No credit info - don't show attribution
    }
    
    if (creditType === 'commercial' && creditSource) {
      return `Photo credit: ${creditSource}`;
    } else if (creditType === 'own' && creditSource && creditSource !== 'Buttons Flower Farm') {
      return `Photo credit: ${creditSource}`;
    } else if (creditType === 'own' && !creditSource) {
      // If type is 'own' but no source specified, show Buttons Flower Farm
      return `Photo credit: Buttons Flower Farm`;
    } else if (creditType === 'own') {
      return `Photo credit: Buttons Flower Farm`;
    }
    
    return null;
  };
  
  const attribution = getImageAttribution();
  
  // Helper function to check if a URL is from Firebase Storage
  const isFirebaseStorageUrl = (url) => {
    return url && typeof url === 'string' && 
      (url.includes('firebasestorage.googleapis.com') || 
       url.includes('storage.googleapis.com'));
  };
  
  const handleImageError = (e) => {
    console.error('Image failed to load:', plant.mainImage);
    
    // For Firebase Storage URLs, try a cache-busting approach first
    if (!imageError && isFirebaseStorageUrl(plant.mainImage)) {
      console.log('Attempting to reload Firebase image with cache-busting...');
      const cacheBuster = `?alt=media&t=${Date.now()}`;
      const urlBase = plant.mainImage.split('?')[0];
      e.target.src = `${urlBase}${cacheBuster}`;
      setImageError(true); // Mark that we've tried once
    } else {
      // Fall back to placeholder
      e.target.src = '/images/placeholder.jpg';
    }
  };

  return (
    <div className="plant-card">
      <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="plant-image">
          <img 
            src={plant.mainImage} 
            alt={plant.name} 
            onError={handleImageError}
          />
          {attribution && (
            <div className="plant-image-attribution">
              {attribution}
            </div>
          )}
        </div>
        <div className="plant-info">
          <h3>{plant.name}</h3>
          <p className="price">${plant.price ? plant.price.toFixed(2) : '0.00'}</p>
          {plant.inventory && plant.inventory.status && (
            <div className={`inventory-status ${plant.inventory.status.toLowerCase().replace(' ', '-')}`}>
              {plant.inventory.status}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default PlantCard; 