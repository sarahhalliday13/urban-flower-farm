import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Development mode flag - should match the one in AuthContext
const DEV_MODE = true;

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Enable dev mode if the URL includes ?devMode=true
  useEffect(() => {
    if (DEV_MODE && location.search.includes('devMode=true')) {
      localStorage.setItem('devMode', 'true');
      // Force reload to apply the dev mode
      window.location.href = location.pathname;
    }
  }, [location]);
  
  if (!isAuthenticated) {
    // Redirect to login page, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

export default ProtectedRoute; 