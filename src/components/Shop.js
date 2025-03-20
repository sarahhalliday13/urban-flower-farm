import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Shop.css';
import { useCart } from '../context/CartContext';
import { fetchPlants, loadSamplePlants } from '../services/firebase';
import PlantImage from './PlantImage';

function Shop() {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortOption, setSortOption] = useState('default'); // 'default', 'price-low-high', 'price-high-low'

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

  // Sort plants based on selected option
  const sortedPlants = useMemo(() => {
    if (!plants.length) return [];
    
    switch (sortOption) {
      case 'price-low-high':
        return [...plants].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      case 'price-high-low':
        return [...plants].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      default:
        return plants;
    }
  }, [plants, sortOption]);

  const handleAddToCart = (plant) => {
    // Try to add to cart and get result
    const added = addToCart(plant, 1);
    
    // Only show success message if item was actually added
    if (added) {
      // Dispatch the toast event for success
      const event = new CustomEvent('show-toast', {
        detail: {
          message: `${plant.name} has been added to your cart`,
          type: 'success',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  if (loading) return <div className="loading">Loading plants...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!plants || plants.length === 0) return <div className="error">No plants available</div>;

  return (
    <div className={`shop-main ${viewMode === 'list' ? 'list-view-mode' : ''}`}>
      <section className="featured-plants">
        <div className="shop-header">
          <h2>Shop</h2>
          <div className="shop-controls">
            <div className="sort-control">
              <label htmlFor="sort-select">Sort by:</label>
              <select 
                id="sort-select" 
                value={sortOption} 
                onChange={handleSortChange}
                className="sort-select"
                aria-label="Sort plants by selected option"
              >
                <option value="default">Default</option>
                <option value="price-low-high">Price: Low to High</option>
                <option value="price-high-low">Price: High to Low</option>
              </select>
            </div>
            <div className="view-toggle">
              <button 
                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`} 
                onClick={toggleViewMode}
                title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
                aria-label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </button>
            </div>
          </div>
        </div>
        <div className={`plant-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {sortedPlants.map(plant => {
            return (
              <div key={plant.id} className="plant-card" data-plant={plant.name}>
                {viewMode === 'grid' ? (
                  // Grid view - link wraps the entire content except actions
                  <>
                    <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="plant-image">
                        <PlantImage plant={plant} height={250} width="100%" />
                      </div>
                      <h3 className="plant-common-name">{plant.name}</h3>
                      <p className="plant-description">
                        {plant.shortDescription || plant.description?.substring(0, 80) + '...'}
                      </p>
                      <div className="plant-info-row">
                        {plant.inventory?.status && (
                          <div className="plant-status">
                            <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                              {plant.inventory.status}
                            </span>
                          </div>
                        )}
                        <p className="plant-price">${plant.price}</p>
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
                  </>
                ) : (
                  // List view - separate elements with links only on title and image
                  <>
                    <div className="plant-image">
                      <Link to={`/plant/${plant.id}`} style={{ display: 'block', height: '100%' }}>
                        <PlantImage plant={plant} height="100%" width="100%" />
                      </Link>
                    </div>
                    <div className="plant-content">
                      <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 className="plant-common-name">{plant.name}</h3>
                      </Link>
                      <p className="plant-description">
                        {plant.shortDescription || plant.description?.substring(0, 120) + '...'}
                      </p>
                      <div className="plant-info-row">
                        {plant.inventory?.status && (
                          <div className="plant-status">
                            <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                              {plant.inventory.status}
                            </span>
                          </div>
                        )}
                        <p className="plant-price">${plant.price}</p>
                      </div>
                    </div>
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Shop; 