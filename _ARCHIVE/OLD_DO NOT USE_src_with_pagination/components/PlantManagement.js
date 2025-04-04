import React, { useState, useEffect } from 'react';
import { fetchPlants, addPlant, updatePlant } from '../services/firebase';
import '../styles/PlantManagement.css';

const PlantManagement = () => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentPlant, setCurrentPlant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    scientificName: '',
    price: '',
    description: '',
    mainImage: '',
    colour: '',
    light: '',
    height: '',
    bloomSeason: '',
    attributes: '',
    hardinessZone: '',
    spacing: ''
  });
  const [saveStatus, setSaveStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load plants on component mount
  useEffect(() => {
    loadPlants();
  }, []);

  // Load plants from Firebase
  const loadPlants = async () => {
    try {
      setLoading(true);
      const plantsData = await fetchPlants();
      setPlants(plantsData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading plants:', err);
      setError(`Failed to load plants: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');

    try {
      // Prepare plant data
      const plantData = {
        ...formData,
        // If editing, keep the existing ID, otherwise generate a new one
        id: editMode && currentPlant ? currentPlant.id : Math.max(0, ...plants.map(p => p.id)) + 1
      };

      if (editMode && currentPlant) {
        // Update existing plant
        await updatePlant(currentPlant.id, plantData);
        setSaveStatus('success');
        
        // Update local plants array
        setPlants(prev => prev.map(p => 
          p.id === currentPlant.id ? { ...p, ...plantData } : p
        ));
      } else {
        // Add new plant
        await addPlant(plantData);
        setSaveStatus('success');
        
        // Add to local plants array
        setPlants(prev => [...prev, plantData]);
      }

      // Reset form after successful save
      setTimeout(() => {
        resetForm();
        setSaveStatus('');
      }, 2000);
    } catch (error) {
      console.error('Error saving plant:', error);
      setSaveStatus('error');
    }
  };

  // Reset form and exit edit mode
  const resetForm = () => {
    setFormData({
      name: '',
      scientificName: '',
      price: '',
      description: '',
      mainImage: '',
      colour: '',
      light: '',
      height: '',
      bloomSeason: '',
      attributes: '',
      hardinessZone: '',
      spacing: ''
    });
    setEditMode(false);
    setCurrentPlant(null);
  };

  // Handle edit button click
  const handleEdit = (plant) => {
    setCurrentPlant(plant);
    setFormData({
      name: plant.name || '',
      scientificName: plant.scientificName || '',
      price: plant.price || '',
      description: plant.description || '',
      mainImage: plant.mainImage || '',
      colour: plant.colour || '',
      light: plant.light || '',
      height: plant.height || '',
      bloomSeason: plant.bloomSeason || '',
      attributes: plant.attributes || '',
      hardinessZone: plant.hardinessZone || '',
      spacing: plant.spacing || ''
    });
    setEditMode(true);
  };

  // Filter plants based on search term
  const filteredPlants = plants.filter(plant => 
    plant.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    plant.scientificName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(plant.id).includes(searchTerm)
  );

  if (loading) return (
    <div className="plant-management-loading">
      <div className="loading-spinner"></div>
      <p>Loading plants...</p>
    </div>
  );

  if (error) return (
    <div className="plant-management-error">
      <p>{error}</p>
      <button onClick={loadPlants}>Try Again</button>
    </div>
  );

  return (
    <div className="plant-management">
      <h1>{editMode ? 'Edit Plant' : 'Add New Plant'}</h1>
      
      <form className="plant-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Plant Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="scientificName">Scientific Name</label>
            <input
              type="text"
              id="scientificName"
              name="scientificName"
              value={formData.scientificName}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price">Price</label>
            <input
              type="text"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="mainImage">Main Image URL</label>
            <input
              type="text"
              id="mainImage"
              name="mainImage"
              value={formData.mainImage}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>
        
        <div className="form-group full-width">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
          ></textarea>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="colour">Color</label>
            <input
              type="text"
              id="colour"
              name="colour"
              value={formData.colour}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="light">Light Requirements</label>
            <input
              type="text"
              id="light"
              name="light"
              value={formData.light}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="height">Height</label>
            <input
              type="text"
              id="height"
              name="height"
              value={formData.height}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="bloomSeason">Bloom Season</label>
            <input
              type="text"
              id="bloomSeason"
              name="bloomSeason"
              value={formData.bloomSeason}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hardinessZone">Hardiness Zone</label>
            <input
              type="text"
              id="hardinessZone"
              name="hardinessZone"
              value={formData.hardinessZone}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="spacing">Spacing</label>
            <input
              type="text"
              id="spacing"
              name="spacing"
              value={formData.spacing}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-group full-width">
          <label htmlFor="attributes">Attributes</label>
          <input
            type="text"
            id="attributes"
            name="attributes"
            value={formData.attributes}
            onChange={handleChange}
            placeholder="Drought-tolerant, Deer-resistant, etc."
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className={`save-btn ${saveStatus}`}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving...' : editMode ? 'Update Plant' : 'Add Plant'}
          </button>
          
          {editMode && (
            <button 
              type="button" 
              className="cancel-btn"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
          
          {saveStatus === 'success' && (
            <span className="success-message">Plant saved successfully!</span>
          )}
          
          {saveStatus === 'error' && (
            <span className="error-message">Error saving plant. Please try again.</span>
          )}
        </div>
      </form>
      
      <div className="plants-list-section">
        <h2>Existing Plants</h2>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="Search plants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="plants-list">
          {filteredPlants.length === 0 ? (
            <p className="no-plants">No plants found matching your search.</p>
          ) : (
            filteredPlants.map(plant => (
              <div key={plant.id} className="plant-item">
                <div className="plant-info">
                  <h3>{plant.name}</h3>
                  <p className="scientific-name">{plant.scientificName}</p>
                  <p className="price">${plant.price}</p>
                </div>
                <div className="plant-image">
                  {plant.mainImage ? (
                    <img src={plant.mainImage} alt={plant.name} />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                </div>
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(plant)}
                >
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="google-sheets-section">
        <h2>Bulk Management with Google Sheets</h2>
        <p>
          You can still use Google Sheets for bulk plant management. Any changes made in the Google Sheet
          will be reflected here after running the migration tool.
        </p>
        <a href="/firebase-migration" className="sheets-link">Go to Migration Tool</a>
      </div>
    </div>
  );
};

export default PlantManagement; 