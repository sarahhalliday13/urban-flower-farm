import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Shop.css';
import { useCart } from '../context/CartContext';
import { fetchPlants, loadSamplePlants } from '../services/firebase';

// Added ShopImage component for better image handling
const ShopImage = ({ plant }) => {
  const [imageSrc, setImageSrc] = useState('/images/placeholder.jpg');
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Set correct image URL on component mount
  useEffect(() => {
    let src = plant.mainImage || '/images/placeholder.jpg';
    
    // Use hard-coded URLs for specific plants
    if (plant.name === "Palmer's Beardtongue") {
      src = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
      console.log('Setting hard-coded Palmer URL in Shop:', src);
    } 
    else if (plant.name === "Gaillardia Pulchella Mix") {
      src = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
      console.log('Setting hard-coded Gaillardia URL in Shop:', src);
    }
    
    setImageSrc(src);
  }, [plant.name, plant.mainImage]);
  
  return (
    <>
      {!imageLoaded && 
        <div style={{
          height: "200px",
          background: "#f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <span>Loading...</span>
        </div>
      }
      <img 
        src={imageSrc}
        alt={plant.name}
        style={{ display: imageLoaded ? 'block' : 'none' }}
        onLoad={() => {
          console.log(`Image loaded successfully in Shop: ${plant.name}`);
          setImageLoaded(true);
        }}
        onError={(e) => {
          console.error('Image failed to load:', imageSrc);
          
          // Try cache-busting for Firebase URLs
          if (!imageSrc.includes('&t=') && imageSrc.includes('firebasestorage')) {
            console.log('Adding cache buster to Firebase URL:', plant.name);
            const timestamp = Date.now();
            const newSrc = imageSrc.includes('?') 
              ? `${imageSrc}&t=${timestamp}` 
              : `${imageSrc}?alt=media&t=${timestamp}`;
              
            console.log('New src with cache buster:', newSrc);
            setImageSrc(newSrc);
          } else {
            // We've already tried or it's not a Firebase URL, use placeholder
            console.log('Using placeholder for', plant.name);
            setImageSrc('/images/placeholder.jpg');
          }
        }}
      />
    </>
  );
};

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
        <div className="featured-plants-header">
          <h2>All the Flowers</h2>
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
            console.log('Rendering plant:', plant);
            return (
              <div key={plant.id} className="plant-card">
                {viewMode === 'grid' ? (
                  // Grid view - link wraps the entire content except actions
                  <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="plant-image">
                      <ShopImage plant={plant} />
                    </div>
                    <h3 className="plant-common-name">{plant.name}</h3>
                    <p className="plant-description">
                      {plant.shortDescription || plant.description?.substring(0, 80) + '...'}
                    </p>
                    <p>${plant.price}</p>
                    {plant.inventory?.status && (
                      <div className="plant-status">
                        <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                          {plant.inventory.status}
                        </span>
                      </div>
                    )}
                  </Link>
                ) : (
                  // List view - separate elements with links only on title and image
                  <>
                    <Link to={`/plant/${plant.id}`} className="plant-image" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <ShopImage plant={plant} />
                    </Link>
                    <div className="plant-content">
                      <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 className="plant-common-name">{plant.name}</h3>
                      </Link>
                      <p className="plant-description">
                        {plant.shortDescription || plant.description?.substring(0, 120) + '...'}
                      </p>
                      <p>${plant.price}</p>
                      {plant.inventory?.status && (
                        <div className="plant-status">
                          <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                            {plant.inventory.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
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
    </div>
  );
}

export default Shop; 