import React, { useState } from 'react';
import { importPlantsFromSheets, initializeDefaultInventory, loadSamplePlants } from '../services/firebase';
import '../styles/FirebaseMigration.css';
import { Link } from 'react-router-dom';

const FirebaseMigration = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('sample'); // Default to sample data tab
  
  // Sample Data tab states
  const [migrationStatus, setMigrationStatus] = useState({
    loading: false,
    success: false,
    error: null,
    message: '',
    plantsCount: 0
  });

  // Sample data import handler
  const handleSampleDataImport = async () => {
    setMigrationStatus({
      loading: true,
      success: false,
      error: null,
      message: 'Loading sample plant data...',
      plantsCount: 0
    });

    try {
      // Step 1: Load sample plants
      const plantsData = await loadSamplePlants();
      
      setMigrationStatus(prev => ({
        ...prev,
        message: `Found ${plantsData.length} sample plants. Importing to Firebase...`
      }));

      // Step 2: Import plants to Firebase
      const result = await importPlantsFromSheets(plantsData);
      
      // Step 3: Initialize default inventory if needed
      await initializeDefaultInventory();

      setMigrationStatus({
        loading: false,
        success: true,
        error: null,
        message: `Successfully imported ${result.plantsCount} sample plants to Firebase!`,
        plantsCount: result.plantsCount
      });
    } catch (error) {
      console.error('Error importing sample data:', error);
      setMigrationStatus({
        loading: false,
        success: false,
        error: error,
        message: `Error importing sample data: ${error.message}`,
        plantsCount: 0
      });
    }
  };

  return (
    <div className="firebase-migration">
      <h1>Plant Data Management</h1>
      
      <div className="tab-container">
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'sample' ? 'active' : ''}`}
            onClick={() => setActiveTab('sample')}
          >
            Sample Data
          </button>
          <button 
            className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Plant Inventory
          </button>
        </div>
        
        {/* Sample Data Tab */}
        {activeTab === 'sample' && (
          <div className="tab-content">
            <div className="migration-option full-width">
              <h2>Sample Data Import</h2>
              <p>
                Import sample plant data to Firebase. This is useful for quickly populating
                your database with a predefined set of plants for testing.
              </p>
              <p className="note">
                <strong>Note:</strong> This will add the sample plants to your database. If plants with the same IDs already exist,
                they will be updated with the sample data.
              </p>
              
              <button 
                className={`migration-button ${migrationStatus.loading ? 'loading' : ''}`}
                onClick={handleSampleDataImport}
                disabled={migrationStatus.loading}
              >
                {migrationStatus.loading ? 'Importing...' : 'Import Sample Plants'}
              </button>
              
              {migrationStatus.success && (
                <div className="success-message">
                  <p>{migrationStatus.message}</p>
                </div>
              )}
              
              {migrationStatus.error && (
                <div className="error-message">
                  <p>{migrationStatus.message}</p>
                </div>
              )}

              <div className="migration-help">
                <h3>How Sample Data Import Works</h3>
                <ol>
                  <li>The sample data consists of pre-defined plants with images and details</li>
                  <li>When you click "Import Sample Plants", the data will be loaded from the public directory</li>
                  <li>The plants will be imported into your Firebase database</li>
                  <li>Default inventory data will be created for each plant</li>
                  <li>After import completes, verify your plants in the Inventory tab</li>
                </ol>
              </div>
            </div>
          </div>
        )}
        
        {/* Plant Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="tab-content">
            <div className="migration-option full-width">
              <h2>UI-Based Plant Management</h2>
              <p>
                Use our user-friendly interface to add, edit, and manage individual plants.
                This is ideal for making quick updates or adding new plants one at a time.
              </p>
              <p className="note">
                <strong>Tip:</strong> The Plant Inventory page includes both inventory management and plant details 
                management in one place with a tabbed interface.
              </p>
              
              <div className="inventory-link-container">
                <Link to="/inventory" className="inventory-link">
                  Go to Plant Inventory Manager
                </Link>
              </div>
              
              <div className="migration-help">
                <h3>Inventory Manager Features</h3>
                <ul>
                  <li><strong>Inventory Tab:</strong> View, search and filter all plants</li>
                  <li><strong>Add New Flower Tab:</strong> Add new plants with detailed information</li>
                  <li><strong>Edit Plants:</strong> Click on any plant to edit its details</li>
                  <li><strong>Update Inventory:</strong> Manage stock levels, status, and restock dates</li>
                  <li><strong>Image Management:</strong> Add and update plant images</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="navigation-links">
        <Link to="/" className="nav-link">Back to Home</Link>
      </div>
    </div>
  );
};

export default FirebaseMigration; 