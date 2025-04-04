import React, { useState, useEffect } from 'react';

const PlantImage = ({ plant, height = 200, width = "100%", style }) => {
  const [imageSrc, setImageSrc] = useState('/images/placeholder.jpg');

  useEffect(() => {
    // Get a suitable image - use the first available option in order of preference
    const sourceImage = plant.mainImage || 
                       (Array.isArray(plant.images) && plant.images.length > 0 ? plant.images[0] : null) ||
                       plant.imageURL ||
                       '/images/placeholder.jpg';
    
    setImageSrc(sourceImage);
    
    // Debug-only logging for Firebase URLs without tokens
    if (process.env.NODE_ENV === 'development' && 
        sourceImage && 
        sourceImage.includes('firebasestorage.googleapis.com') && 
        !sourceImage.includes('token=')) {
      // Silently log to console
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