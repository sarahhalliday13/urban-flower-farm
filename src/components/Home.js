import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPlants, loadSamplePlants } from '../services/firebase';
import { useCart } from '../context/CartContext';
import Toast from './Toast';

function Home({ isFirstVisit }) {
  const [showHero, setShowHero] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [featuredPlants, setFeaturedPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { addToCart } = useCart();

  useEffect(() => {
    // Set heroHidden to true in localStorage to ensure it stays hidden across sessions
    localStorage.setItem('heroHidden', 'true');
    
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

  // Fetch plants from Firebase with fallbacks
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
        
        if (!data || data.length === 0) {
          console.log('No plants found in Firebase, trying sample data');
          const sampleData = await loadSamplePlants();
          if (sampleData.length === 0) {
            setError('No plants found');
            setLoading(false);
            return;
          }
          processPlantsData(sampleData);
        } else {
          processPlantsData(data);
        }
      } catch (err) {
        console.error('Error fetching plants from Firebase:', err);
        try {
          // Try sample data if Firebase fetch fails
          const sampleData = await loadSamplePlants();
          processPlantsData(sampleData);
        } catch (sampleErr) {
          console.error('Failed to load sample data:', sampleErr);
          setError(`Failed to load plants: ${err.message}`);
          setLoading(false);
        }
      }
    };
    
    // Helper function to process the fetched plants data
    const processPlantsData = (data) => {
      // Filter for featured plants
      const featured = data.filter(plant => 
        plant.featured === 'yes' || 
        plant.featured === 'true' || 
        plant.featured === true || 
        plant.featured === '1' || 
        plant.featured === 1
      );
      
      // If no plants are marked as featured, just show the first 3 plants
      if (featured.length === 0) {
        setFeaturedPlants(data.slice(0, 3));
      } else {
        setFeaturedPlants(featured);
      }
      
      setLoading(false);
    };

    loadPlants();
  }, []);

  const hideHero = () => {
    setShowHero(false);
    localStorage.setItem('heroHidden', 'true');
  };

  // eslint-disable-next-line no-unused-vars
  const handleAddToCart = (plant) => {
    addToCart(plant);
    setToastMessage(`${plant.name} has been added to your cart`);
    setShowToast(true);
  };
  
  return (
    <main>
      {showHero && (
        <section className={`hero ${!isFirstVisit ? 'compact' : ''}`}>
          <button className="hero-close" onClick={hideHero}>×</button>
          <div className="hero-content">
            <h1>Welcome</h1>
            <p>Discover beautiful plants for your home and garden</p>
          </div>
        </section>
      )}

      <section className="featured-plants">
        <div className="featured-plants-header">
          {!isMobile && <h2>Featured</h2>}
          <Link to="/shop" className="view-all-link">View All</Link>
        </div>
        
        {loading ? (
          <div className="loading">Loading featured plants...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="plant-grid">
            {featuredPlants.map(plant => (
              <div key={plant.id} className="plant-card">
                <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="plant-image">
                    <img 
                      src={plant.mainImage} 
                      alt={plant.name} 
                      onError={(e) => {
                        console.error('Image failed to load:', plant.mainImage);
                        e.target.src = '/images/placeholder.jpg';
                      }}
                    />
                  </div>
                  <h3>{plant.name}</h3>
                  <p className="plant-description">
                    {plant.shortDescription || plant.description?.substring(0, 120) + '...'}
                  </p>
                  {plant.inventory?.status && (
                    <div className="plant-status">
                      <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(' ', '-') || 'unknown'}`}>
                        {plant.inventory.status}
                      </span>
                    </div>
                  )}
                </Link>
                <div className="plant-actions">
                  <Link to={`/plant/${plant.id}`} className="plant-view">View Details</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
    </main>
  );
}

export default Home; 