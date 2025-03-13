import React, { useState } from 'react';
import { importPlantsFromSheets, initializeDefaultInventory, loadSamplePlants } from '../services/firebase';
import '../styles/FirebaseMigration.css';
import { Link } from 'react-router-dom';

const FirebaseMigration = () => {
  const [migrationStatus, setMigrationStatus] = useState({
    loading: false,
    success: false,
    error: null,
    message: '',
    plantsCount: 0
  });

  const handleMigration = async () => {
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
        message: `Successfully imported ${plantsData.length} plants to Firebase`,
        plantsCount: plantsData.length
      });
    } catch (error) {
      console.error('Import error:', error);
      setMigrationStatus({
        loading: false,
        success: false,
        error: error.message,
        message: `Import failed: ${error.message}`,
        plantsCount: 0
      });
    }
  };

  return (
    <div className="firebase-migration">
      <h1>Plant Data Management</h1>
      
      <div className="migration-options">
        <div className="migration-option">
          <h2>Sample Data Import</h2>
          <p>
            Import sample plant data to Firebase. This is useful for quickly populating
            your database with a predefined set of plants.
          </p>
          <p className="note">
            <strong>Note:</strong> This will add the sample plants to your database. If plants with the same IDs already exist,
            they will be updated with the sample data.
          </p>
          
          <button 
            className={`migration-button ${migrationStatus.loading ? 'loading' : ''}`}
            onClick={handleMigration}
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
        </div>
        
        <div className="migration-option">
          <h2>UI-Based Plant Management</h2>
          <p>
            Use our user-friendly interface to add, edit, and manage individual plants.
            This is ideal for making quick updates or adding new plants one at a time.
          </p>
          <p className="note">
            <strong>Tip:</strong> The Plant Inventory page now includes both inventory management and plant details 
            management in one place with a tabbed interface.
          </p>
          
          <Link to="/inventory" className="migration-button">
            Go to Plant Inventory
          </Link>
        </div>
      </div>
      
      <div className="migration-help">
        <h3>Which option should I use?</h3>
        <ul>
          <li><strong>Sample Data Import:</strong> Best for quickly populating your database with sample plants. Use when setting up a new system or for testing.</li>
          <li><strong>UI-Based Management:</strong> Best for individual plant additions or edits. More user-friendly and includes image upload capabilities.</li>
        </ul>
        <p>
          You can use both options interchangeably. Changes made in either system will be reflected in your plant catalog.
        </p>
      </div>
    </div>
  );
};

export default FirebaseMigration; 