import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const FirebaseTest = () => {
  const [testResult, setTestResult] = useState({ status: 'idle', message: 'Click to test' });
  const [firestoreResult, setFirestoreResult] = useState({ status: 'idle', message: 'Click to test Firestore' });
  const [firebaseConfig, setFirebaseConfig] = useState({});

  // Load and display Firebase config on mount
  useEffect(() => {
    const config = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID
    };
    setFirebaseConfig(config);
  }, []);

  const testFirebaseConnection = async () => {
    setTestResult({ status: 'testing', message: 'Testing Firebase connection...' });
    
    try {
      // Check if Firebase config variables are defined
      if (!process.env.REACT_APP_FIREBASE_API_KEY || !process.env.REACT_APP_FIREBASE_DATABASE_URL) {
        setTestResult({ 
          status: 'error', 
          message: 'Firebase environment variables are missing. Check .env file.' 
        });
        return;
      }
      
      // Try to initialize Firebase and connect
      console.log('Initializing Firebase with config:', firebaseConfig);
      const app = initializeApp(firebaseConfig, 'testApp');
      const database = getDatabase(app);
      
      // Try to fetch a simple test path
      console.log('Testing Firebase connection...');
      const testRef = ref(database, 'test');
      const snapshot = await get(testRef);
      
      setTestResult({ 
        status: 'success', 
        message: `Firebase connection successful! Database URL: ${process.env.REACT_APP_FIREBASE_DATABASE_URL}`,
        data: snapshot.exists() ? snapshot.val() : 'No data at test path'
      });
    } catch (error) {
      console.error('Firebase test error:', error);
      setTestResult({ 
        status: 'error', 
        message: `Firebase connection failed: ${error.message}`,
        error: error
      });
    }
  };

  const testFirestoreConnection = async () => {
    setFirestoreResult({ status: 'testing', message: 'Testing Firestore connection...' });
    
    try {
      // Check if Firebase config variables are defined
      if (!process.env.REACT_APP_FIREBASE_API_KEY || !process.env.REACT_APP_FIREBASE_PROJECT_ID) {
        setFirestoreResult({ 
          status: 'error', 
          message: 'Firebase environment variables are missing. Check .env file.' 
        });
        return;
      }
      
      // Try to initialize Firebase and connect to Firestore
      console.log('Initializing Firestore with config:', firebaseConfig);
      const app = initializeApp(firebaseConfig, 'firestoreTestApp');
      const db = getFirestore(app);
      
      // Try to fetch a collection - try 'orders' first, then 'plants' if that fails
      console.log('Testing Firestore connection with orders collection...');
      let collectionName = 'orders';
      let colRef = collection(db, collectionName);
      
      try {
        const snapshot = await getDocs(colRef);
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setFirestoreResult({
          status: 'success', 
          message: `Firestore connection successful! Found ${docs.length} documents in '${collectionName}' collection.`,
          data: docs.length > 0 ? docs.slice(0, 2) : 'No documents found in collection'
        });
      } catch (firstError) {
        console.warn('First collection test failed, trying plants collection:', firstError);
        
        // Try 'plants' collection
        collectionName = 'plants';
        colRef = collection(db, collectionName);
        
        try {
          const snapshot = await getDocs(colRef);
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setFirestoreResult({
            status: 'success', 
            message: `Firestore connection successful! Found ${docs.length} documents in '${collectionName}' collection.`,
            data: docs.length > 0 ? docs.slice(0, 2) : 'No documents found in collection'
          });
        } catch (secondError) {
          throw new Error(`Failed to access both 'orders' and 'plants' collections: ${secondError.message}`);
        }
      }
    } catch (error) {
      console.error('Firestore test error:', error);
      setFirestoreResult({ 
        status: 'error', 
        message: `Firestore connection failed: ${error.message}`,
        error: error
      });
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif' 
    }}>
      <h1>Firebase Connection Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Environment Variables</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '5px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            REACT_APP_FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY ? '✓ Defined' : '✗ Missing',
            REACT_APP_FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? '✓ Defined' : '✗ Missing',
            REACT_APP_FIREBASE_DATABASE_URL: process.env.REACT_APP_FIREBASE_DATABASE_URL ? '✓ Defined' : '✗ Missing',
            REACT_APP_FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID ? '✓ Defined' : '✗ Missing',
            REACT_APP_FIREBASE_STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? '✓ Defined' : '✗ Missing',
            REACT_APP_FIREBASE_MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ? '✓ Defined' : '✗ Missing',
            REACT_APP_FIREBASE_APP_ID: process.env.REACT_APP_FIREBASE_APP_ID ? '✓ Defined' : '✗ Missing',
          }, null, 2)}
        </pre>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={testFirebaseConnection}
          disabled={testResult.status === 'testing'}
          style={{
            padding: '10px 20px',
            backgroundColor: testResult.status === 'testing' ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: testResult.status === 'testing' ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {testResult.status === 'testing' ? 'Testing...' : 'Test Firebase Database'}
        </button>
        
        <button 
          onClick={testFirestoreConnection}
          disabled={firestoreResult.status === 'testing'}
          style={{
            padding: '10px 20px',
            backgroundColor: firestoreResult.status === 'testing' ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: firestoreResult.status === 'testing' ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {firestoreResult.status === 'testing' ? 'Testing...' : 'Test Firestore'}
        </button>
      </div>
      
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: 
          testResult.status === 'success' ? '#e8f5e9' : 
          testResult.status === 'error' ? '#ffebee' : 
          '#f5f5f5',
        border: `1px solid ${
          testResult.status === 'success' ? '#a5d6a7' : 
          testResult.status === 'error' ? '#ffcdd2' : 
          '#ddd'
        }`,
        borderRadius: '4px'
      }}>
        <h3>Realtime Database Test Result: {testResult.status.toUpperCase()}</h3>
        <p>{testResult.message}</p>
        
        {testResult.data && (
          <div>
            <h4>Data:</h4>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '5px',
              overflow: 'auto'
            }}>
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          </div>
        )}
        
        {testResult.error && (
          <div style={{ marginTop: '15px' }}>
            <h4>Error Details:</h4>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '5px',
              overflow: 'auto',
              color: '#f44336'
            }}>
              {testResult.error.code && `Error Code: ${testResult.error.code}\n`}
              {testResult.error.message}
              {testResult.error.stack && `\n\nStack Trace:\n${testResult.error.stack}`}
            </pre>
          </div>
        )}
      </div>
      
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: 
          firestoreResult.status === 'success' ? '#e8f5e9' : 
          firestoreResult.status === 'error' ? '#ffebee' : 
          '#f5f5f5',
        border: `1px solid ${
          firestoreResult.status === 'success' ? '#a5d6a7' : 
          firestoreResult.status === 'error' ? '#ffcdd2' : 
          '#ddd'
        }`,
        borderRadius: '4px'
      }}>
        <h3>Firestore Test Result: {firestoreResult.status.toUpperCase()}</h3>
        <p>{firestoreResult.message}</p>
        
        {firestoreResult.data && (
          <div>
            <h4>Data:</h4>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '5px',
              overflow: 'auto'
            }}>
              {JSON.stringify(firestoreResult.data, null, 2)}
            </pre>
          </div>
        )}
        
        {firestoreResult.error && (
          <div style={{ marginTop: '15px' }}>
            <h4>Error Details:</h4>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '5px',
              overflow: 'auto',
              color: '#f44336'
            }}>
              {firestoreResult.error.code && `Error Code: ${firestoreResult.error.code}\n`}
              {firestoreResult.error.message}
              {firestoreResult.error.stack && `\n\nStack Trace:\n${firestoreResult.error.stack}`}
            </pre>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h2>Possible Solutions</h2>
        <ul>
          <li>Check if your Firebase project is properly set up and the database is created</li>
          <li>Verify that your Firebase database rules allow read/write access</li>
          <li>Ensure that all Firebase environment variables are correctly set in your .env file</li>
          <li>Check your internet connection</li>
          <li>If using a VPN, try disabling it as it might interfere with Firebase connections</li>
          <li>Clear browser cache and cookies</li>
          <li>If Firestore test fails but Realtime Database works, check Firestore setup in Firebase console</li>
          <li>Verify Firestore security rules allow access from your staging domain</li>
        </ul>
      </div>
    </div>
  );
};

export default FirebaseTest; 