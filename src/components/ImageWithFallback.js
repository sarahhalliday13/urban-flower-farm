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
  // Using hasError to set a placeholder image
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src || '');
  
  // Add debugging to help identify image issues
  useEffect(() => {
    // This will help identify when props change
    if (src) {
      // Clean up the URL for display in the console
      const shortSrc = src.length > 50 ? `${src.substring(0, 47)}...` : src;
      console.log(`ImageWithFallback received src: ${shortSrc} for alt: ${alt || 'Unknown'}`);
      setImageSrc(src);
    } else {
      setImageSrc('/images/placeholder.jpg');
    }
  }, [src, alt]);
  
  // Helper function to check if a URL or text contains keywords
  const contains = (text, keywords) => {
    if (!text) return false;
    return keywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  };
  
  // For known plants with Firebase issues, hardcode the correct URLs
  useEffect(() => {
    // Check for known problematic plants and apply special handling
    if (src) {
      if (((alt && contains(alt, ["Palmer's", "Palmer", "Beardtongue", "Penstemon"])) || 
           (src && contains(src, ["palmer", "penstemon", "beardtongue"])))) {
        console.log(`Special handling for Palmer's Beardtongue`, { src, alt });
        setImageSrc("https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739");
      } 
      else if (((alt && contains(alt, ["Gaillardia", "Pulchella"])) || 
                (src && contains(src, ["gaillardia", "pulchella"])))) {
        console.log(`Special handling for Gaillardia Pulchella`, { src, alt });
        setImageSrc("https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739");
      }
      else if (src.startsWith('local:')) {
        // Handle local URLs (remove the 'local:' prefix)
        setImageSrc(src.substring(6));
      }
      // If we have an error but a source is provided, set the placeholder
      else if (hasError) {
        setImageSrc('/images/placeholder.jpg');
      }
    }
  }, [src, alt, hasError]);
  
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
        onLoad={() => {
          console.log(`Image loaded successfully: ${alt || 'Unknown'}`);
          setIsLoaded(true);
        }}
        onError={(e) => {
          console.log(`Image load error: ${alt || 'Unknown image'} with src: ${imageSrc?.substring(0, 50) || 'no src'}`);
          
          // Additional fallback attempt for specific plants on error
          if (src && ((contains(src, ["palmer", "penstemon", "beardtongue"])) || 
                      (contains(alt, ["Palmer", "Beardtongue", "Penstemon"])))) {
            console.log("Attempting secondary fallback for Palmer's Beardtongue");
            e.target.src = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
          } else if (src && ((contains(src, ["gaillardia", "pulchella"])) || 
                             (contains(alt, ["Gaillardia", "Pulchella"])))) {
            console.log("Attempting secondary fallback for Gaillardia Pulchella");
            e.target.src = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
          } else {
            setHasError(true);
            e.target.src = '/images/placeholder.jpg';
          }
          setIsLoaded(true);
          
          // Return true to prevent the default error handling
          return true;
        }}
      />
    </div>
  );
};

export default ImageWithFallback; 