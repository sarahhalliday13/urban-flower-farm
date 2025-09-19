import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './PlantCard.css';

const PlantCard = ({ plant }) => {
  const [imageError, setImageError] = useState(false);
  
  // Create a safe key from URL for Firebase (replace dots and slashes)
  const createSafeKey = (url) => {
    return url.replace(/[.#$\[\]/]/g, '_');
  };
  
  // Get image attribution text
  const getImageAttribution = () => {
    if (!plant.imageMetadata || !plant.mainImage) return null;
    
    const safeKey = createSafeKey(plant.mainImage);
    const metadata = plant.imageMetadata[safeKey] || plant.imageMetadata[plant.mainImage];
    if (!metadata) return null;
    
    if (metadata.type === 'commercial' && metadata.source) {
      return `Photo credit: ${metadata.source.name}`;
    } else if (metadata.type === 'own') {
      if (metadata.photographer) {
        return `Photo credit: ${metadata.photographer}`;
      } else if (metadata.source === "Buttons Flower Farm") {
        return `Photo credit: Buttons Flower Farm`;
      }
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

  // Check if this is a gift certificate
  const isGiftCertificate = plant.plantType && plant.plantType.toLowerCase() === 'gift certificate';
  
  return (
    <div className={`plant-card ${isGiftCertificate ? 'gift-certificate-card' : ''}`}>
      <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="plant-image">
          <img 
            src={plant.mainImage} 
            alt={plant.name} 
            onError={handleImageError}
          />
          {attribution && !isGiftCertificate && (
            <div className="plant-image-attribution">
              {attribution}
            </div>
          )}
          {isGiftCertificate && (
            <div className="gift-badge">Digital Delivery</div>
          )}
        </div>
        <div className="plant-info">
          <h3>{plant.name}</h3>
          <p className="price">${plant.price}</p>
          {!isGiftCertificate && plant.inventory && plant.inventory.status && (
            <div className={`inventory-status ${plant.inventory.status.toLowerCase().replace(' ', '-')}`}>
              {plant.inventory.status}
            </div>
          )}
          {isGiftCertificate && (
            <div className="gift-certificate-label">Gift Certificate</div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default PlantCard; 