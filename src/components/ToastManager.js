import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import Toast from './Toast';
import './Toast.css';

// Create a context for the toast functionality
export const ToastContext = createContext(null);

// Custom hook for using toasts
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  
  // Create a function to show toast that components can call directly
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const newToast = {
      id: Date.now(),
      message,
      type,
      duration
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove toast after duration
    setTimeout(() => {
      handleCloseToast(newToast.id);
    }, duration);
  }, []);
  
  useEffect(() => {
    // Event listener for showing toasts
    const handleShowToast = (event) => {
      const { message, type = 'info', duration = 3000 } = event.detail;
      showToast(message, type, duration);
    };
    
    // Add event listener
    window.addEventListener('show-toast', handleShowToast);
    
    // Clean up
    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, [showToast]);
  
  const handleCloseToast = (id) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, closing: true } : toast
    ));
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 400); // Match animation duration
  };
  
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => handleCloseToast(toast.id)}
            closing={toast.closing}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Maintain backward compatibility
const ToastManager = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Event listener for showing toasts
    const handleShowToast = (event) => {
      const { message, type = 'info', duration = 3000 } = event.detail;
      
      const newToast = {
        id: Date.now(),
        message,
        type,
        duration
      };
      
      setToasts(prev => [...prev, newToast]);
      
      // Auto remove toast after duration
      setTimeout(() => {
        handleCloseToast(newToast.id);
      }, newToast.duration);
    };
    
    // Add event listener
    window.addEventListener('show-toast', handleShowToast);
    
    // Clean up
    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, []);
  
  const handleCloseToast = (id) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, closing: true } : toast
    ));
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 400); // Match animation duration
  };
  
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => handleCloseToast(toast.id)}
          closing={toast.closing}
        />
      ))}
    </div>
  );
};

export default ToastManager; 