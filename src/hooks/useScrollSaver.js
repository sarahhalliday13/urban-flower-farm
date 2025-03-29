
import { useEffect } from 'react';
import { useScrollRestoration } from './ScrollRestorationContext';

/**
 * Hook to save scroll position based on a key
 * @param {string} key - A unique key to identify the scroll position
 */
const useScrollSaver = (key) => {
  const { saveScrollPosition } = useScrollRestoration();
  
  useEffect(() => {
    // Save scroll position when component unmounts
    return () => {
      saveScrollPosition(key, window.scrollY);
    };
  }, [key, saveScrollPosition]);
};

export default useScrollSaver;
