import React, { useState, useEffect } from 'react';

const PlantImage = ({ plant, height = 200, width = "100%", style }) => {
  const [imageSrc, setImageSrc] = useState('/images/placeholder.jpg');

  useEffect(() => {
    // More robust image source selection algorithm
    let sourceImage = '/images/placeholder.jpg';
    
    // First try to use mainImage explicitly
    if (plant.mainImage) {
      sourceImage = plant.mainImage;
    } 
    // If no mainImage but have images array and mainImageIndex
    else if (Array.isArray(plant.images) && plant.images.length > 0) {
      if (plant.mainImageIndex !== undefined && 
          plant.mainImageIndex >= 0 && 
          plant.mainImageIndex < plant.images.length) {
        // Use the image at the specified mainImageIndex
        sourceImage = plant.images[plant.mainImageIndex];
      } else {
        // If no valid mainImageIndex, just use the first image
        sourceImage = plant.images[0];
      }
    } 
    // If images is an object (common in Firebase)
    else if (typeof plant.images === 'object' && plant.images !== null) {
      const imageArray = Object.values(plant.images)
        .filter(img => typeof img === 'string' && img.trim() !== '');
      
      if (imageArray.length > 0) {
        if (plant.mainImageIndex !== undefined && 
            plant.mainImageIndex >= 0 && 
            plant.mainImageIndex < imageArray.length) {
          sourceImage = imageArray[plant.mainImageIndex];
        } else {
          sourceImage = imageArray[0];
        }
      }
    }
    // Fallback options if we still don't have an image
    else if (plant.imageURL) {
      sourceImage = plant.imageURL;
    }
    
    // Set the image source
    setImageSrc(sourceImage);
    
    // Debug-only logging for Firebase URLs without tokens
    if (process.env.NODE_ENV === 'development' && 
        sourceImage && 
        sourceImage.includes('firebasestorage.googleapis.com') && 
        !sourceImage.includes('token=')) {
      console.debug('Firebase URL missing token:', plant.name);
    }
  }, [plant]);
  
  // Very simple styles
  const containerStyle = {
    height: height,
    width: width,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
    borderRadius: '4px',
    minWidth: '100%', // Ensure full width
    ...(style || {}) // Merge custom styles if provided
  };
  
  const handleImageError = (e) => {
    // Silently handle errors since we know things are working
    e.target.src = '/images/placeholder.jpg';
    
    // Debug-only logging for Firebase URLs errors
    if (process.env.NODE_ENV === 'development' && 
        e.target.src.includes('firebasestorage.googleapis.com')) {
      console.debug('Firebase image load handled for:', plant.name);
    }
  };
  
  return (
    <div style={containerStyle}>
      <img 
        src={imageSrc} 
        alt={plant.name} 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        onError={handleImageError}
      />
    </div>
  );
};

export default PlantImage; 