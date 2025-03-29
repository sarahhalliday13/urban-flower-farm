import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useScrollRestoration } from './ScrollRestorationContext';

export const useScrollSaver = () => {
  const location = useLocation();
  const positions = useScrollRestoration();

  useEffect(() => {
    return () => {
      positions.set(location.key, window.scrollY);
    };
  }, [location, positions]);
};
