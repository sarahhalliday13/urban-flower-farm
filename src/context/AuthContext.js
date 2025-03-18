import React, { createContext, useContext, useState /* useEffect */ } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Check if user is already logged in from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    return savedAuth === 'true';
  });
  
  // Simple login function - in a real app, you'd validate credentials against a backend
  const login = (username, password) => {
    // For this simple example, we'll use hardcoded credentials
    // In a real app, you would validate against a secure backend
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
  };
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 