import React, { useState } from 'react';

/**
 * A simple image component with fallback handling
 */
const ImageWithFallback = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  height = 200,
  width = 'auto'
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Use placeholder if image fails to load
  const imgSrc = hasError ? '/images/placeholder.jpg' : src;
  
  // Special handling for specific plants
  const isSpecialPlant = alt === "Palmer's Beardtongue" || alt === "Lavender Mist";
  
  return (
    <div style={{ 
      position: 'relative', 
      height: height, 
      width: width,
      overflow: 'hidden'
    }}>
      {!isLoaded && 
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "#f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <span>Loading...</span>
        </div>
      }
      <img 
        src={imgSrc}
        alt={alt}
        className={className}
        style={{ 
          ...style,
          width: '100%',
          height: '100%',
          objectFit: isSpecialPlant ? 'cover' : 'cover',
          display: 'block'
        }}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
      />
    </div>
  );
};

export default ImageWithFallback; 