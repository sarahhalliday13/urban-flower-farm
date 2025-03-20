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
  
  // Add debugging for Firebase URLs and fix missing tokens
  useEffect(() => {
    if (src) {
      let finalSrc = src;
      
      // Debug output for Firebase URLs
      if (src.includes('firebasestorage.googleapis.com')) {
        console.log(`Firebase URL detected for ${alt || 'image'}:`, src.substring(0, 100) + '...');
        
        // Check if URL is missing token and fix it
        if (!src.includes('token=')) {
          console.log('Firebase URL is missing token parameter, adding default token');
          // Add default token parameter if missing
          const defaultToken = '655fba6f-d45e-44eb-8e01-eee626300739';
          finalSrc = src.includes('?') 
            ? `${src}&token=${defaultToken}` 
            : `${src}?alt=media&token=${defaultToken}`;
          console.log('Fixed URL:', finalSrc.substring(0, 100) + '...');
        }
      } else if (src.startsWith('plant_images/') || src.startsWith('/plant_images/')) {
        // Convert relative Firebase path to absolute URL
        console.log('Converting relative Firebase path to absolute URL');
        const defaultToken = '655fba6f-d45e-44eb-8e01-eee626300739';
        const bucket = 'buttonsflowerfarm-8a54d.firebasestorage.app';
        const path = src.startsWith('/') ? src.substring(1) : src;
        finalSrc = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${defaultToken}`;
        console.log('Converted URL:', finalSrc.substring(0, 100) + '...');
      }
      
      setImageSrc(finalSrc);
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
          
          // Special handling for Firebase Storage URLs
          if (imageSrc && imageSrc.includes('firebasestorage.googleapis.com')) {
            console.error('Firebase storage URL failed. Trying with placeholder token...');
            
            // Try to fix the URL with a placeholder token if it's missing
            if (!imageSrc.includes('token=')) {
              const defaultToken = '655fba6f-d45e-44eb-8e01-eee626300739';
              const fixedUrl = imageSrc.includes('?') 
                ? `${imageSrc}&token=${defaultToken}` 
                : `${imageSrc}?alt=media&token=${defaultToken}`;
                
              console.log('Attempting with fixed URL:', fixedUrl);
              e.target.src = fixedUrl;
              return; // Don't set the placeholder yet, try the fixed URL first
            }
            
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
          
          // If we reach here, use the placeholder
          e.target.src = '/images/placeholder.jpg';
          setIsLoaded(true);
          return true;
        }}
      />
    </div>
  );
};

export default ImageWithFallback; 