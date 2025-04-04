import React, { useState, useEffect } from 'react';
import './RouterModeToggle.css';

/**
 * Component to toggle between BrowserRouter and HashRouter modes
 * Useful for troubleshooting navigation issues on certain browsers
 */
const RouterModeToggle = () => {
  const [isHashRouter, setIsHashRouter] = useState(
    localStorage.getItem('useHashRouter') === 'true'
  );
  
  // Toggle router mode
  const toggleRouterMode = () => {
    const newMode = !isHashRouter;
    setIsHashRouter(newMode);
    localStorage.setItem('useHashRouter', newMode);
    
    // Force reload to apply the new router
    window.location.href = newMode 
      ? '/#' + window.location.pathname
      : window.location.hash.replace('#', '');
  };
  
  // Add CSS for the toggle
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .router-mode-toggle {
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
        z-index: 9999;
        opacity: 0.5;
        transition: opacity 0.3s;
      }
      
      .router-mode-toggle:hover {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return (
    <button 
      className="router-mode-toggle"
      onClick={toggleRouterMode}
    >
      {isHashRouter ? 'Using Hash Router' : 'Using Browser Router'}
    </button>
  );
};

export default RouterModeToggle; 