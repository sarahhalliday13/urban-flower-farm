import React, { useState, useEffect, useMemo, Component } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Shop.css';
import { useCart } from '../context/CartContext';
import { fetchPlants, loadSamplePlants } from '../services/firebase';
import ImageWithFallback from './ImageWithFallback';

// Add an error boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Shop component error caught:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong in the Shop.</h2>
          <details>
            <summary>Error Details</summary>
            <p>{this.state.error && this.state.error.toString()}</p>
            <p>Component Stack: {this.state.errorInfo && this.state.errorInfo.componentStack}</p>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
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
              // IMPORTANT: This app MUST use Firebase Storage URLs for images, not local paths.
              // Images should use Firebase Storage URLs with format:
              // https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2F[filename].jpg?alt=media&token=[token]
              
              // Get Firebase Storage URLs with tokens
              let imageSrc = plant.mainImage || '/images/placeholder.jpg';
              
              // Special handling for known plants
              if (plant.name === "Palmer's Beardtongue") {
                imageSrc = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
              } else if (plant.name === "Gaillardia Pulchella Mix") {
                imageSrc = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
              } else if (plant.name === "Lavender Mist") {
                // Use the mainImage from plant data, which should already have the Firebase URL
                imageSrc = plant.mainImage;
              } else if (plant.name === "Golden Jubilee Anise Hyssop") {
                // Use the mainImage from plant data, which should already have the Firebase URL
                imageSrc = plant.mainImage;
              }
              
              return (
                <div key={plant.id} className="plant-card">
                  {viewMode === 'grid' ? (
                    // Grid view - link wraps the entire content except actions
                    <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="plant-image">
                        <ImageWithFallback 
                          src={imageSrc}
                          alt={plant.name}
                          height={200}
                        />
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
                        <ImageWithFallback 
                          src={imageSrc}
                          alt={plant.name}
                          height={200}
                        />
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
    </ErrorBoundary>
  );
}

export default Shop; 