
import React, { createContext, useContext, useState } from 'react';

const ScrollRestorationContext = createContext(undefined);

export const useScrollRestoration = () => {
  const context = useContext(ScrollRestorationContext);
  if (!context) {
    throw new Error('useScrollRestoration must be used within a ScrollRestorationProvider');
  }
  return context;
};

export const ScrollRestorationProvider = ({ children }) => {
  const [scrollPositions, setScrollPositions] = useState({});

  // Save scroll position by key
  const saveScrollPosition = (key, position) => {
    setScrollPositions(prev => ({
      ...prev,
      [key]: position
    }));
  };

  // Get scroll position by key
  const getScrollPosition = (key) => {
    return scrollPositions[key] || 0;
  };

  // Context value
  const value = {
    saveScrollPosition,
    getScrollPosition
  };

  return (
    <ScrollRestorationContext.Provider value={value}>
      {children}
    </ScrollRestorationContext.Provider>
  );
};
