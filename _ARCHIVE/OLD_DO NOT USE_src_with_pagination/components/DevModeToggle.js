import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const DevModeToggle = () => {
  const { toggleDevMode } = useAuth();
  const [isDevMode, setIsDevMode] = useState(false);
  
  useEffect(() => {
    // Check current dev mode status
    const devModeStatus = localStorage.getItem('devMode') === 'true';
    setIsDevMode(devModeStatus);
  }, []);
  
  const handleToggle = () => {
    const newStatus = toggleDevMode();
    setIsDevMode(newStatus);
  };
  
  const toggleStyle = {
    padding: '10px 15px',
    backgroundColor: isDevMode ? '#4CAF50' : '#f0f0f0',
    color: isDevMode ? 'white' : '#333',
    border: isDevMode ? '1px solid #388E3C' : '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '200px'
  };
  
  const toggleSlider = {
    position: 'relative',
    display: 'inline-block',
    width: '40px',
    height: '20px',
    backgroundColor: isDevMode ? '#4CAF50' : '#ccc',
    borderRadius: '20px',
    transition: 'all 0.3s',
    marginLeft: '10px'
  };
  
  const toggleCircle = {
    position: 'absolute',
    top: '2px',
    left: isDevMode ? '22px' : '2px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: 'white',
    transition: 'all 0.3s'
  };
  
  return (
    <div style={{ margin: '20px 0' }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Development Mode</div>
      <button onClick={handleToggle} style={toggleStyle}>
        <span>{isDevMode ? 'Enabled' : 'Disabled'}</span>
        <div style={toggleSlider}>
          <div style={toggleCircle}></div>
        </div>
      </button>
      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
        {isDevMode 
          ? '✅ Login bypass is active - no credentials needed' 
          : '❌ Normal authentication required'}
      </div>
    </div>
  );
};

export default DevModeToggle; 