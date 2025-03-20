import React from 'react';

const PlantImage = ({ plant, height = 200, width = "auto" }) => {
  // Get a suitable image - use the first available option
  const imageSrc = plant.mainImage || '/images/placeholder.jpg';
  
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
        onError={(e) => {
          e.target.src = '/images/placeholder.jpg';
        }}
      />
    </div>
  );
};

export default PlantImage; 