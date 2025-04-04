import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import { getDatabaseRef } from '../services/firebase';

const FirebaseDebugger = () => {
  const [status, setStatus] = useState({
    firebase: { status: 'checking', error: null },
    plants: { status: 'checking', count: 0, error: null },
    inventory: { status: 'checking', count: 0, error: null },
    orders: { status: 'checking', count: 0, error: null },
    news: { status: 'checking', count: 0, error: null },
    environment: process.env.NODE_ENV,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
  });

  const [expanded, setExpanded] = useState({});

  // Test direct Firebase connection
  useEffect(() => {
    const testFirebase = async () => {
      try {
        console.log('Testing Firebase connection...');
        const db = getDatabase();
        const rootRef = ref(db, '/');
        setStatus(prev => ({
          ...prev,
          firebase: { status: 'connecting', error: null }
        }));
        
        await get(rootRef);
        
        setStatus(prev => ({
          ...prev,
          firebase: { status: 'connected', error: null }
        }));
      } catch (error) {
        console.error('Firebase connection test failed:', error);
        setStatus(prev => ({
          ...prev,
          firebase: { 
            status: 'failed', 
            error: error.message || 'Unknown error' 
          }
        }));
      }
    };

    testFirebase();
  }, []);

  // Test plants data
  useEffect(() => {
    const testPlants = async () => {
      try {
        console.log('Testing plants data...');
        setStatus(prev => ({
          ...prev,
          plants: { status: 'loading', count: 0, error: null }
        }));
        
        const plantsRef = getDatabaseRef('plants');
        const snapshot = await get(plantsRef);
        
        if (snapshot.exists()) {
          const plantsData = snapshot.val();
          const count = Object.keys(plantsData).length;
          setStatus(prev => ({
            ...prev,
            plants: { 
              status: 'loaded', 
              count: count, 
              error: null, 
              sample: Object.keys(plantsData).slice(0, 3)
            }
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            plants: { status: 'empty', count: 0, error: 'No plants data found' }
          }));
        }
      } catch (error) {
        console.error('Plants data test failed:', error);
        setStatus(prev => ({
          ...prev,
          plants: { 
            status: 'failed', 
            count: 0, 
            error: error.message || 'Unknown error' 
          }
        }));
      }
    };

    testPlants();
  }, []);

  // Test inventory data
  useEffect(() => {
    const testInventory = async () => {
      try {
        console.log('Testing inventory data...');
        setStatus(prev => ({
          ...prev,
          inventory: { status: 'loading', count: 0, error: null }
        }));
        
        const inventoryRef = getDatabaseRef('inventory');
        const snapshot = await get(inventoryRef);
        
        if (snapshot.exists()) {
          const inventoryData = snapshot.val();
          const count = Object.keys(inventoryData).length;
          setStatus(prev => ({
            ...prev,
            inventory: { 
              status: 'loaded', 
              count: count, 
              error: null,
              sample: Object.keys(inventoryData).slice(0, 3)
            }
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            inventory: { status: 'empty', count: 0, error: 'No inventory data found' }
          }));
        }
      } catch (error) {
        console.error('Inventory data test failed:', error);
        setStatus(prev => ({
          ...prev,
          inventory: { 
            status: 'failed', 
            count: 0, 
            error: error.message || 'Unknown error' 
          }
        }));
      }
    };

    testInventory();
  }, []);

  // Test orders data
  useEffect(() => {
    const testOrders = async () => {
      try {
        console.log('Testing orders data...');
        setStatus(prev => ({
          ...prev,
          orders: { status: 'loading', count: 0, error: null }
        }));
        
        const ordersRef = getDatabaseRef('orders');
        const snapshot = await get(ordersRef);
        
        if (snapshot.exists()) {
          const ordersData = snapshot.val();
          const count = Object.keys(ordersData).length;
          setStatus(prev => ({
            ...prev,
            orders: { 
              status: 'loaded', 
              count: count, 
              error: null,
              sample: Object.keys(ordersData).slice(0, 3)
            }
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            orders: { status: 'empty', count: 0, error: 'No orders data found' }
          }));
        }
      } catch (error) {
        console.error('Orders data test failed:', error);
        setStatus(prev => ({
          ...prev,
          orders: { 
            status: 'failed', 
            count: 0, 
            error: error.message || 'Unknown error' 
          }
        }));
      }
    };

    testOrders();
  }, []);

  // Test news data
  useEffect(() => {
    const testNews = async () => {
      try {
        console.log('Testing news data...');
        setStatus(prev => ({
          ...prev,
          news: { status: 'loading', count: 0, error: null }
        }));
        
        const newsRef = getDatabaseRef('news');
        const snapshot = await get(newsRef);
        
        if (snapshot.exists()) {
          const newsData = snapshot.val();
          const count = Object.keys(newsData).length;
          setStatus(prev => ({
            ...prev,
            news: { 
              status: 'loaded', 
              count: count, 
              error: null,
              sample: Object.keys(newsData).slice(0, 3)
            }
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            news: { status: 'empty', count: 0, error: 'No news data found' }
          }));
        }
      } catch (error) {
        console.error('News data test failed:', error);
        setStatus(prev => ({
          ...prev,
          news: { 
            status: 'failed', 
            count: 0, 
            error: error.message || 'Unknown error' 
          }
        }));
      }
    };

    testNews();
  }, []);

  const toggleExpanded = (section) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'loaded':
        return 'green';
      case 'empty':
        return 'orange';
      case 'failed':
        return 'red';
      case 'connecting':
      case 'loading':
      case 'checking':
      default:
        return 'gray';
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Firebase Connection Debugger</h1>

      <div style={styles.configSection}>
        <h2 style={styles.sectionTitle}>Environment</h2>
        <p><strong>Mode:</strong> {status.environment}</p>
        <p><strong>Auth Domain:</strong> {status.authDomain || 'Not set'}</p>
        <p><strong>Database URL:</strong> {status.databaseURL || 'Not set'}</p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Firebase Connection Status
          <span style={{
            ...styles.statusBadge,
            backgroundColor: getStatusColor(status.firebase.status)
          }}>
            {status.firebase.status}
          </span>
        </h2>
        {status.firebase.error && (
          <div style={styles.errorContainer}>
            <p style={styles.errorMessage}>Error: {status.firebase.error}</p>
          </div>
        )}

        <div style={{marginTop: 20}}>
          <h2 style={styles.sectionTitle}>
            <button 
              style={styles.expandButton}
              onClick={() => toggleExpanded('plants')}
            >
              {expanded.plants ? '▼' : '▶'} Plants Data
            </button>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: getStatusColor(status.plants.status)
            }}>
              {status.plants.status}
            </span>
            <span style={styles.countBadge}>
              {status.plants.count} items
            </span>
          </h2>
          {expanded.plants && status.plants.error && (
            <div style={styles.errorContainer}>
              <p style={styles.errorMessage}>Error: {status.plants.error}</p>
            </div>
          )}
          {expanded.plants && status.plants.sample && (
            <div style={styles.sampleData}>
              <p>Sample IDs: {status.plants.sample.join(', ')}</p>
            </div>
          )}
        </div>

        <div style={{marginTop: 20}}>
          <h2 style={styles.sectionTitle}>
            <button 
              style={styles.expandButton}
              onClick={() => toggleExpanded('inventory')}
            >
              {expanded.inventory ? '▼' : '▶'} Inventory Data
            </button>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: getStatusColor(status.inventory.status)
            }}>
              {status.inventory.status}
            </span>
            <span style={styles.countBadge}>
              {status.inventory.count} items
            </span>
          </h2>
          {expanded.inventory && status.inventory.error && (
            <div style={styles.errorContainer}>
              <p style={styles.errorMessage}>Error: {status.inventory.error}</p>
            </div>
          )}
          {expanded.inventory && status.inventory.sample && (
            <div style={styles.sampleData}>
              <p>Sample IDs: {status.inventory.sample.join(', ')}</p>
            </div>
          )}
        </div>

        <div style={{marginTop: 20}}>
          <h2 style={styles.sectionTitle}>
            <button 
              style={styles.expandButton}
              onClick={() => toggleExpanded('orders')}
            >
              {expanded.orders ? '▼' : '▶'} Orders Data
            </button>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: getStatusColor(status.orders.status)
            }}>
              {status.orders.status}
            </span>
            <span style={styles.countBadge}>
              {status.orders.count} items
            </span>
          </h2>
          {expanded.orders && status.orders.error && (
            <div style={styles.errorContainer}>
              <p style={styles.errorMessage}>Error: {status.orders.error}</p>
            </div>
          )}
          {expanded.orders && status.orders.sample && (
            <div style={styles.sampleData}>
              <p>Sample IDs: {status.orders.sample.join(', ')}</p>
            </div>
          )}
        </div>

        <div style={{marginTop: 20}}>
          <h2 style={styles.sectionTitle}>
            <button 
              style={styles.expandButton}
              onClick={() => toggleExpanded('news')}
            >
              {expanded.news ? '▼' : '▶'} News Data
            </button>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: getStatusColor(status.news.status)
            }}>
              {status.news.status}
            </span>
            <span style={styles.countBadge}>
              {status.news.count} items
            </span>
          </h2>
          {expanded.news && status.news.error && (
            <div style={styles.errorContainer}>
              <p style={styles.errorMessage}>Error: {status.news.error}</p>
            </div>
          )}
          {expanded.news && status.news.sample && (
            <div style={styles.sampleData}>
              <p>Sample IDs: {status.news.sample.join(', ')}</p>
            </div>
          )}
        </div>
      </div>

      <div style={styles.troubleshootSection}>
        <h2 style={styles.sectionTitle}>Troubleshooting Steps</h2>
        <ol style={styles.troubleshootList}>
          <li>
            <strong>Missing Java:</strong> The Firebase emulator requires Java to be installed. 
            Your logs show Java is missing, which is why the emulator won't start.
            <pre style={styles.codeBlock}>
              Error: Process `java -version` has exited with code 1. <br/>
              Please make sure Java is installed and on your system PATH.
            </pre>
          </li>
          <li>
            <strong>Install Java:</strong> Download and install Java from <a href="https://www.java.com/en/download/" target="_blank" rel="noopener noreferrer">java.com</a>
          </li>
          <li>
            <strong>Firebase Environment:</strong> Check that your REACT_APP_FIREBASE_DATABASE_URL is correctly set in .env
          </li>
          <li>
            <strong>Production Firebase:</strong> If you want to use production Firebase without the emulator, make sure you're logged in with <code>firebase login</code>
          </li>
        </ol>
      </div>

      <div style={styles.buttonContainer}>
        <button 
          style={styles.refreshButton}
          onClick={() => window.location.reload()}
        >
          Refresh Tests
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
  },
  title: {
    color: '#2c5530',
    textAlign: 'center'
  },
  configSection: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  section: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statusBadge: {
    fontSize: '0.8rem',
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
    fontWeight: 'bold',
    marginLeft: '10px'
  },
  countBadge: {
    fontSize: '0.8rem',
    padding: '4px 8px',
    borderRadius: '12px',
    backgroundColor: '#e9ecef',
    color: '#495057',
    marginLeft: '10px'
  },
  errorContainer: {
    backgroundColor: '#ffeded',
    padding: '10px',
    borderRadius: '4px',
    marginTop: '10px',
    border: '1px solid #ffcccb'
  },
  errorMessage: {
    color: '#d32f2f',
    margin: 0
  },
  expandButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#495057',
    display: 'inline-flex',
    alignItems: 'center',
    padding: 0
  },
  sampleData: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px',
    marginTop: '10px',
    marginLeft: '20px'
  },
  refreshButton: {
    backgroundColor: '#2c5530',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px'
  },
  troubleshootSection: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  troubleshootList: {
    paddingLeft: '20px',
    lineHeight: '1.6'
  },
  codeBlock: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px',
    overflowX: 'auto',
    fontSize: '0.9rem',
    marginTop: '5px'
  }
};

export default FirebaseDebugger; 