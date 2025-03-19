import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import './Toast.css';

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