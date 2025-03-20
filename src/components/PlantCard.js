import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './PlantCard.css';

const PlantCard = ({ plant }) => {
  const [imageError, setImageError] = useState(false);
  
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
        </div>
        <div className="plant-info">
          <h3>{plant.name}</h3>
          <p className="price">${plant.price}</p>
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