import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

// A stable content wrapper for admin pages
// Works as a safety barrier against errors in admin components
const AdminContentWrapper = ({ children }) => {
  const [error, setError] = useState(null);
  
  // Handle errors from ErrorBoundary
  const handleError = (error, errorInfo) => {
    console.error('Error in admin component:', error, errorInfo);
    
    // Set a user-friendly error message
    setError({
      title: 'Something went wrong',
      message: 'There was an error loading this admin section. Please try again later.',
      originalError: error
    });
  };
  
  // If there's an error, show a custom error UI
  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#fff',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        margin: '20px auto',
        maxWidth: '800px'
      }}>
        <h2 style={{ color: '#d32f2f' }}>{error.title}</h2>
        <p>{error.message}</p>
        
        <div style={{ margin: '20px 0' }}>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#2c5530',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              margin: '0 10px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
          
          <button 
            onClick={() => window.location.href = '/'} 
            style={{
              background: '#777',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              margin: '0 10px',
              cursor: 'pointer'
            }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }
  
  // Render the children inside an error boundary
  return (
    <div className="admin-content-area" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <ErrorBoundary onError={handleError}>
        {children}
      </ErrorBoundary>
    </div>
  );
};

export default AdminContentWrapper; 