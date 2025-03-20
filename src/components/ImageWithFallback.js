import React, { useState, useEffect } from 'react';

/**
 * A simplified image component with fallback handling
 * 
 * IMPORTANT: This application uses Firebase Storage URLs ONLY, not local images.
 * All image URLs should follow this format:
 * https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2F[filename].jpg?alt=media&token=[token]
 * 
 * Special treatment is given to "Palmer's Beardtongue" and "Gaillardia Pulchella Mix" plants,
 * which have hardcoded Firebase Storage URLs with tokens.
 */
const ImageWithFallback = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  height = 200,
  width = 'auto',
  lazyLoad = true
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Force image URLs to include the token for the Firebase URLs if missing
  useEffect(() => {
    console.log(`Image source for ${alt}:`, src);
  }, [src, alt]);

  // Simply use placeholder if src errors
  const imgSrc = hasError ? '/images/placeholder.jpg' : src;
  
  // Default height for placeholder
  const placeholderHeight = height || 200;
  
  return (
    <>
      {!isLoaded && 
        <div 
          className="image-placeholder" 
          style={{
            height: `${placeholderHeight}px`,
            width: width,
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
        loading={lazyLoad ? "lazy" : "eager"}
        style={{ 
          ...style,
          display: isLoaded ? 'block' : 'none' 
        }}
        onLoad={() => {
          console.log(`Image loaded successfully: ${alt}`);
          setIsLoaded(true);
        }}
        onError={() => {
          console.error(`Image failed to load: ${src}`);
          setHasError(true);
          // Still mark as loaded to show the placeholder
          setIsLoaded(true);
        }}
      />
    </>
  );
};

export default ImageWithFallback; 