import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Shop.css';
import { useCart } from '../context/CartContext';
import { fetchPlants, loadSamplePlants } from '../services/firebase';
import Toast from './Toast';

function Shop() {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    const loadPlants = async () => {
      setLoading(true);
      
      // Create a timeout to handle cases where Firebase fetch hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase fetch timed out')), 5000);
      });
      
      try {
        // Race between the actual fetch and the timeout
        const data = await Promise.race([
          fetchPlants(),
          timeoutPromise
        ]);
        
        console.log('Fetched plants:', data);
        
        if (!data || data.length === 0) {
          console.log('No plants found in Firebase, trying sample data');
          const sampleData = await loadSamplePlants();
          if (sampleData.length === 0) {
            setError('No plants found');
            setLoading(false);
            return;
          }
          setPlants(sampleData);
        } else {
          setPlants(data);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching plants from Firebase:', err);
        try {
          // Try sample data if Firebase fetch fails
          const sampleData = await loadSamplePlants();
          setPlants(sampleData);
          setLoading(false);
        } catch (sampleErr) {
          console.error('Failed to load sample data:', sampleErr);
          setError(`Failed to load plants: ${err.message}`);
          setLoading(false);
        }
      }
    };

    loadPlants();
  }, []);

  const handleAddToCart = (plant) => {
    addToCart(plant);
    setToastMessage(`${plant.name} has been added to your cart`);
    setShowToast(true);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  if (loading) return <div className="loading">Loading plants...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!plants || plants.length === 0) return <div className="error">No plants available</div>;

  return (
    <div className="shop-main">
      <section className="featured-plants">
        <div className="featured-plants-header">
          <h2>All the Flowers</h2>
          <div className="view-toggle">
            <button 
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`} 
              onClick={toggleViewMode}
              title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            >
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </button>
          </div>
        </div>
        <div className={`plant-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {plants.map(plant => {
            console.log('Rendering plant:', plant);
            return (
              <div key={plant.id} className="plant-card">
                <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="plant-image">
                    <img src={plant.mainImage} alt={plant.name} onError={(e) => {
                      console.error('Image failed to load:', plant.mainImage);
                      e.target.src = '/images/placeholder.jpg';
                    }} />
                  </div>
                  <div className="plant-details">
                    <h3>{plant.name}</h3>
                    <p>${plant.price}</p>
                    <div className="plant-status">
                      <span className={`status-badge ${plant.inventory?.status?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                        {plant.inventory?.status || 'Status Unknown'}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="plant-actions">
                  <Link to={`/plant/${plant.id}`} className="plant-view">View</Link>
                  <button 
                    className={`plant-buy ${!plant.inventory?.currentStock ? 'sold-out' : ''}`} 
                    onClick={() => handleAddToCart(plant)}
                    disabled={!plant.inventory?.currentStock}
                  >
                    {plant.inventory?.currentStock > 0 ? 'Buy' : 'Sold Out'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
    </div>
  );
}

export default Shop; 