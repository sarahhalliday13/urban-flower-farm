import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

// Development mode flag - should match the one in AuthContext
const DEV_MODE = true;

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const usernameInputRef = useRef(null);
  
  // Focus the username input field when the component mounts
  useEffect(() => {
    if (usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
    
    // Check for dev mode activation via URL parameter
    if (DEV_MODE && location.search.includes('devMode=true')) {
      localStorage.setItem('devMode', 'true');
      // Navigate to admin dashboard
      navigate('/admin', { replace: true });
    }
  }, [location, navigate]);
  
  // Get the page the user was trying to access
  const from = location.state?.from?.pathname || '/admin';
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    const success = login(username, password);
    
    if (success) {
      // Always redirect to admin dashboard regardless of where they came from
      navigate('/admin', { replace: true });
    } else {
      setError('Invalid username or password');
    }
  };
  
  // Function to enable dev mode
  const enableDevMode = (e) => {
    e.preventDefault();
    localStorage.setItem('devMode', 'true');
    navigate('/admin');
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Admin Login</h2>
        <p className="login-subtitle">Please log in to access the inventory management</p>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              ref={usernameInputRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          
          <button type="submit" className="login-button">Login</button>
          
          {/* Hidden dev mode link - only visible in development */}
          {DEV_MODE && (
            <div className="dev-mode-section" style={{ marginTop: '20px', textAlign: 'center' }}>
              <hr style={{ margin: '20px 0', borderTop: '1px dashed #ddd' }} />
              <button 
                onClick={enableDevMode} 
                style={{ 
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#999',
                  textDecoration: 'underline',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Enable Development Mode
              </button>
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '5px' }}>
                For development & testing only
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login; 