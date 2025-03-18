import React, { createContext, useContext, useState /* useEffect */ } from 'react';

// Development mode flag - set to true to bypass login during development
const DEV_MODE = true; // Set this to false before deploying to production

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Check if user is already logged in from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Auto-authenticate in dev mode if the dev flag is set in localStorage
    if (DEV_MODE && localStorage.getItem('devMode') === 'true') {
      return true;
    }
    
    const savedAuth = localStorage.getItem('isAuthenticated');
    return savedAuth === 'true';
  });
  
  // Simple login function - in a real app, you'd validate credentials against a backend
  const login = (username, password) => {
    // For this simple example, we'll use hardcoded credentials
    // In a real app, you would validate against a secure backend
    
    // Dev mode bypass - any credentials work if devMode is enabled
    if (DEV_MODE && localStorage.getItem('devMode') === 'true') {
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      return true;
    }
    
    if (username === 'admin' && password === 'buttons123isacunt') {
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      return true;
    }
    return false;
  };
  
  // Logout function
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    // Don't remove devMode flag on logout to maintain bypass
  };
  
  // Toggle development mode for testing
  const toggleDevMode = () => {
    const isDevMode = localStorage.getItem('devMode') === 'true';
    if (isDevMode) {
      localStorage.removeItem('devMode');
      // Only log out if we were authenticated solely by dev mode
      if (localStorage.getItem('isAuthenticated') !== 'true') {
        setIsAuthenticated(false);
      }
    } else {
      localStorage.setItem('devMode', 'true');
      setIsAuthenticated(true);
    }
    return !isDevMode;
  };
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, toggleDevMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 