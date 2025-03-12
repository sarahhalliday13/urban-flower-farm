import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPlants } from '../services/sheets';
import { useCart } from '../context/CartContext';
import Toast from './Toast';

function Home() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [featuredPlants, setFeaturedPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { addToCart } = useCart();

  useEffect(() => {
    // Add event listener for window resize
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch plants from spreadsheet
  useEffect(() => {
    const loadPlants = async () => {
      try {
        const data = await fetchPlants();
        if (!data || data.length === 0) {
          setError('No plants found');
          return;
        }
        
        // Filter for featured plants
        // Assuming there's a 'featured' field in the spreadsheet that's set to 'yes', 'true', or '1'
        const featured = data.filter(plant => 
          plant.featured === 'yes' || 
          plant.featured === 'true' || 
          plant.featured === true || 
          plant.featured === '1' || 
          plant.featured === 1
        );
        
        // If no plants are marked as featured, just show the first 2-3 plants
        if (featured.length === 0) {
          setFeaturedPlants(data.slice(0, 3));
        } else {
          setFeaturedPlants(featured);
        }
      } catch (err) {
        console.error('Error loading plants:', err);
        setError(`Failed to load plants: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadPlants();
  }, []);

  const handleAddToCart = (plant) => {
    addToCart(plant);
    setToastMessage(`${plant.name} has been added to your cart`);
    setShowToast(true);
  };
  
  return (
    <main>
      <section className="featured-plants">
        <div className="featured-plants-header">
          {!isMobile && <h2>Featured</h2>}
          <Link to="/shop" className="view-all-link">View All</Link>
        </div>
        
        {loading ? (
          <div className="loading">Loading plants...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="plant-grid">
            {featuredPlants.map(plant => (
              <div key={plant.id} className="plant-card">
                <Link to={`/plant/${plant.id}`} className="plant-link">
                  <div className="plant-image-container">
                    <img 
                      src={plant.image || 'https://via.placeholder.com/300x300?text=Plant+Image'} 
                      alt={plant.name} 
                      className="plant-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                      }}
                    />
                  </div>
                  <div className="plant-info">
                    <h3 className="plant-name">{plant.name}</h3>
                    <p className="plant-price">${parseFloat(plant.price).toFixed(2)}</p>
                  </div>
                </Link>
                <button 
                  className="add-to-cart-btn"
                  onClick={() => handleAddToCart(plant)}
                  disabled={plant.status !== 'In Stock'}
                >
                  {plant.status === 'In Stock' ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {showToast && (
        <Toast message={toastMessage} onClose={() => setShowToast(false)} />
      )}
    </main>
  );
}

export default Home; 