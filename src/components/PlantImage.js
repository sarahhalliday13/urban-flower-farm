import React, { useState, useEffect } from 'react';

const PlantImage = ({ plant, height = 200, width = "auto" }) => {
  const [imageSrc, setImageSrc] = useState('/images/placeholder.jpg');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Get a suitable image - use the first available option in order of preference
    const sourceImage = plant.mainImage || 
                       (Array.isArray(plant.images) && plant.images.length > 0 ? plant.images[0] : null) ||
                       '/images/placeholder.jpg';
    
    setImageSrc(sourceImage);
    
    // If the image source contains firebasestorage but no token, log a warning
    if (sourceImage && 
        sourceImage.includes('firebasestorage.googleapis.com') && 
        !sourceImage.includes('token=')) {
      console.warn('Firebase URL missing token:', plant.name, sourceImage.substring(0, 100) + '...');
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
    borderRadius: '4px'
  };
  
  const handleImageError = (e) => {
    console.warn(`Image load failed for: ${plant.name}`, e.target.src);
    setImageError(true);
    e.target.src = '/images/placeholder.jpg';
    
    // Check if it's a Firebase URL that failed
    if (e.target.src.includes('firebasestorage.googleapis.com')) {
      console.error('Firebase image load error:', {
        plant: plant.name,
        url: e.target.src.substring(0, 100) + '...',
        hasToken: e.target.src.includes('token='),
        originalImage: plant.mainImage?.substring(0, 50) + '...' || 'none'
      });
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
        onLoad={() => imageError && console.log(`Image successfully loaded for: ${plant.name}`)}
        onError={handleImageError}
      />
    </div>
  );
};

export default PlantImage; 