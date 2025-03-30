import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Create a context
const ScrollRestorationContext = createContext({
  scrollPositions: {},
  saveScrollPosition: () => {},
  restoreScrollPosition: () => {},
});

// Custom hook for using the scroll restoration context
export const useScrollRestoration = () => useContext(ScrollRestorationContext);

// Provider component
export const ScrollRestorationProvider = ({ children }) => {
  const [scrollPositions, setScrollPositions] = useState({});
  const location = useLocation();

  // Save scroll position for a specific path
  const saveScrollPosition = (path) => {
    const scrollY = window.scrollY;
    
    setScrollPositions((prevState) => ({
      ...prevState,
      [path]: scrollY,
    }));
  };

  // Restore scroll position for the current path
  const restoreScrollPosition = (path) => {
    if (scrollPositions[path] !== undefined) {
      setTimeout(() => {
        window.scrollTo(0, scrollPositions[path]);
      }, 0);
      return true;
    }
    return false;
  };

  // Save scroll position when navigating away
  useEffect(() => {
    const currentPath = location.pathname;
    
    return () => {
      saveScrollPosition(currentPath);
    };
  }, [location.pathname]);

  // Provide context values
  const contextValue = {
    scrollPositions,
    saveScrollPosition,
    restoreScrollPosition,
  };

  return (
    <ScrollRestorationContext.Provider value={contextValue}>
      {children}
    </ScrollRestorationContext.Provider>
  );
};

export default ScrollRestorationContext;
