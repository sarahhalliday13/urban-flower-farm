import React, { useState, useEffect } from 'react';

/**
 * A simple image component with improved fallback handling
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
  const [imageSrc, setImageSrc] = useState('');
  
  // Map of known working image URLs by plant name
  const KNOWN_IMAGES = {
    "Palmer's Beardtongue": "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
    "Gaillardia Pulchella Mix": "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
    "placeholder": "/images/placeholder.jpg"
  };

  // Check if the alt text matches a known plant name
  useEffect(() => {
    if (KNOWN_IMAGES[alt]) {
      console.log(`Using known good image URL for ${alt}`);
      setImageSrc(KNOWN_IMAGES[alt]);
      return;
    }
    
    if (!src) {
      console.log(`No source provided for ${alt || 'image'}, using placeholder`);
      setImageSrc('/images/placeholder.jpg');
      return;
    }
    
    // For Firebase URLs that don't have a token
    if (src.includes('firebasestorage.googleapis.com') && !src.includes('token=')) {
      const tokenizedUrl = `${src}${src.includes('?') ? '&' : '?'}alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739`;
      console.log(`Added token to Firebase URL for ${alt || 'image'}`);
      setImageSrc(tokenizedUrl);
      return;
    }
    
    // For all other URLs, use as is
    setImageSrc(src);
  }, [src, alt, KNOWN_IMAGES]);
  
  const containerStyle = {
    position: 'relative',
    height: height,
    width: width,
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    border: '1px solid #eee',
    borderRadius: '4px'
  };
  
  const imgStyle = {
    ...style,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    display: 'block'
  };
  
  return (
    <div style={containerStyle}>
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
        src={imageSrc}
        alt={alt || 'Image'}
        className={className}
        style={imgStyle}
        loading="lazy"
        onLoad={() => {
          setIsLoaded(true);
        }}
        onError={(e) => {
          console.error(`Failed to load image: ${alt || 'Unknown'}`);
          e.target.src = '/images/placeholder.jpg';
          setIsLoaded(true);
        }}
      />
    </div>
  );
};

export default ImageWithFallback; 