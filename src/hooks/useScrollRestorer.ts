import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useScrollRestoration } from './ScrollRestorationContext';

export const useScrollRestorer = () => {
  const location = useLocation();
  const navigationType = useNavigationType(); // PUSH, POP, REPLACE
  const positions = useScrollRestoration();

  useEffect(() => {
    if (navigationType === 'POP') {
      const y = positions.get(location.key);
      requestAnimationFrame(() => {
        window.scrollTo(0, y ?? 0);
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location, navigationType, positions]);
};
