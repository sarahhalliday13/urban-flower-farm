import React, { useState, useEffect } from 'react';

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
  const [imageSrc, setImageSrc] = useState(src || '');
  
  // Add debugging for Firebase URLs
  useEffect(() => {
    if (src) {
      // Debug output for Firebase URLs
      if (src.includes('firebasestorage.googleapis.com')) {
        console.log(`Firebase URL detected for ${alt || 'image'}:`, src.substring(0, 100) + '...');
      }
      
      setImageSrc(src);
    } else {
      setImageSrc('/images/placeholder.jpg');
    }
  }, [src, alt]);
  
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
        crossOrigin="anonymous" // Try with cross-origin attribute
        onLoad={() => {
          console.log(`Image loaded successfully: ${alt || 'Unknown'} - ${imageSrc.substring(0, 50)}...`);
          setIsLoaded(true);
        }}
        onError={(e) => {
          console.error(`Image load error for ${alt || 'Unknown'}: ${imageSrc.substring(0, 100)}...`);
          
          // For Firebase URLs, log the error details
          if (imageSrc && imageSrc.includes('firebasestorage.googleapis.com')) {
            console.error('Firebase storage URL failed. Using placeholder.');
            
            // Attempt to fetch the image with fetch API to see detailed error
            fetch(imageSrc)
              .then(response => {
                console.log('Fetch response:', response.status, response.statusText);
                return response.blob();
              })
              .catch(fetchError => {
                console.error('Fetch error details:', fetchError);
              });
          }
          
          e.target.src = '/images/placeholder.jpg';
          setIsLoaded(true);
          return true;
        }}
      />
    </div>
  );
};

export default ImageWithFallback; 