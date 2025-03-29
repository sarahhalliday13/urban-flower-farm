import React, { useState, useEffect } from 'react';

const BackToTop = ({ showAlways = false }) => {
  const [isVisible, setIsVisible] = useState(showAlways);

  // Show button when page is scrolled down
  useEffect(() => {
    if (showAlways) return;
    
    const toggleVisibility = () => {
      // Show the button after scrolling down 300px
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [showAlways]);

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`back-to-top ${isVisible ? 'visible' : ''}`}
      onClick={scrollToTop}
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '0',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s',
        cursor: 'pointer',
      }}
    >
      <a 
        href="#top" 
        onClick={(e) => {
          e.preventDefault();
          scrollToTop();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: isHovered ? '#2c5530' : '#f1f7f1',
          color: isHovered ? 'white' : '#2c5530',
          textDecoration: 'none',
          borderRadius: '4px',
          border: '1px solid #a8c5a9',
          boxShadow: isHovered ? '0 2px 5px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
          fontWeight: '500',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ marginRight: '8px' }}>↑</span>
        Back to Top
      </a>
    </div>
  );
};

export default BackToTop; 