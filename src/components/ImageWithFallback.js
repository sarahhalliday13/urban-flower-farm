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
  
  // Update image source when src prop changes
  useEffect(() => {
    if (src) {
      setImageSrc(src);
    } else {
      setImageSrc('/images/placeholder.jpg');
    }
  }, [src]);
  
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
          e.target.src = '/images/placeholder.jpg';
          setIsLoaded(true);
          return true;
        }}
      />
    </div>
  );
};

export default ImageWithFallback; 