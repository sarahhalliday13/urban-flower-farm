import React, { useState } from 'react';

/**
 * A simple image component with fallback handling
 */
const ImageWithFallback = ({ 
  src, 
  alt = '',
  className = '', 
  style = {}, 
  height = 200,
  width = 'auto'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Special direct Firebase URLs for problematic plants
  let imgSrc = src;
  
  // For known plants with Firebase issues, hardcode the correct URLs
  if (alt && alt.includes("Palmer's Beardtongue") && src && !src.includes('token=')) {
    imgSrc = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
  } else if (alt && alt.includes("Gaillardia Pulchella Mix") && src && !src.includes('token=')) {
    imgSrc = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
  } else if (hasError) {
    imgSrc = '/images/placeholder.jpg';
  }
  
  // Add fallback for missing src
  if (!imgSrc) {
    imgSrc = '/images/placeholder.jpg';
  }
  
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
        alt={alt || 'Image'}
        className={className}
        style={{ 
          ...style,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
        onLoad={() => {
          setIsLoaded(true);
        }}
        onError={() => {
          console.log(`Image load error: ${alt || 'Unknown image'}`);
          setHasError(true);
          setIsLoaded(true);
        }}
      />
    </div>
  );
};

export default ImageWithFallback; 