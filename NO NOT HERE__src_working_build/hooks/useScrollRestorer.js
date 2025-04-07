
import { useEffect } from 'react';
import { useScrollRestoration } from './ScrollRestorationContext';

/**
 * Hook to restore scroll position based on a key
 * @param {string} key - A unique key to identify the scroll position
 */
const useScrollRestorer = (key) => {
  const { getScrollPosition } = useScrollRestoration();
  
  useEffect(() => {
    // Restore scroll position
    const position = getScrollPosition(key);
    if (position > 0) {
      window.scrollTo(0, position);
    }
  }, [key, getScrollPosition]);
};

export default useScrollRestorer;
