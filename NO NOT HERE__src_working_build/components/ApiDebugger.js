import React, { useState } from 'react';
import { fetchPlants } from '../services/firebase';

const ApiDebugger = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      // Test Firebase connection by trying to fetch plants
      const startTime = Date.now();
      const plants = await fetchPlants();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      setTestResult({
        success: true,
        message: `Firebase connection successful in ${responseTime}ms`,
        data: plants,
        url: process.env.REACT_APP_FIREBASE_DATABASE_URL
      });
      console.log('Firebase test result:', plants.length, 'plants received');
    } catch (error) {
      setTestResult({ success: false, error: error.message });
      console.error('Firebase test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    // Clear plant-related localStorage items
    localStorage.removeItem('cachedPlantsWithTimestamp');
    localStorage.removeItem('plantInventory');
    localStorage.removeItem('pendingInventoryUpdates');
    
    // Reload the page
    window.location.reload();
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '10px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Debug API
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '300px',
        padding: '15px',
        backgroundColor: '#f8f8f8',
        border: '1px solid #ddd',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>API Debugger</h3>
        <button 
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={handleTestConnection}
          disabled={isLoading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isLoading ? 'Testing...' : 'Test API Connection'}
        </button>
        
        <button 
          onClick={handleClearCache}
          style={{
            padding: '8px 12px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Cache & Reload
        </button>
      </div>

      {testResult && (
        <div 
          style={{ 
            padding: '10px', 
            backgroundColor: testResult.success ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${testResult.success ? '#a5d6a7' : '#ffcdd2'}`,
            borderRadius: '4px',
            marginTop: '10px'
          }}
        >
          <p><strong>Status:</strong> {testResult.success ? 'Success' : 'Failed'}</p>
          {testResult.message && <p><strong>Message:</strong> {testResult.message}</p>}
          {testResult.error && <p><strong>Error:</strong> {testResult.error}</p>}
          {testResult.url && <p><strong>URL:</strong> {testResult.url}</p>}
          {testResult.data && (
            <div>
              <p><strong>Data:</strong> Received {Array.isArray(testResult.data) ? testResult.data.length : 'object'}</p>
              <details>
                <summary>View Data Sample</summary>
                <pre style={{ 
                  maxHeight: '200px', 
                  overflow: 'auto', 
                  backgroundColor: '#f5f5f5', 
                  padding: '8px',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(Array.isArray(testResult.data) && testResult.data.length > 0 
                    ? testResult.data[0] 
                    : testResult.data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <p>Check browser console for detailed logs.</p>
      </div>
    </div>
  );
};

export default ApiDebugger; 