import React, { createContext, useContext, useRef, ReactNode } from 'react';

const ScrollRestorationContext = createContext<Map<string, number> | null>(null);

export const useScrollRestoration = () => {
  const context = useContext(ScrollRestorationContext);
  if (!context) {
    throw new Error('useScrollRestoration must be used within a ScrollRestorationProvider');
  }
  return context;
};

export const ScrollRestorationProvider = ({ children }: { children: ReactNode }) => {
  const positions = useRef(new Map() as Map<string, number>);
  return (
    <ScrollRestorationContext.Provider value={positions.current}>
      {children}
    </ScrollRestorationContext.Provider>
  );
};
