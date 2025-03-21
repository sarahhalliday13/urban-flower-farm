import React, { useState, useEffect, Component } from 'react';
import { Link } from 'react-router-dom';
import { fetchPlants, loadSamplePlants } from '../services/firebase';
import { useCart } from '../context/CartContext';
import PlantImage from './PlantImage';

// Plant Card component with simplified image handling
// 
// IMPORTANT: This app MUST use Firebase Storage URLs for images, not local paths.
// Images should use Firebase Storage with format:
// https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2F[filename].jpg?alt=media&token=[token]
const PlantCard = ({ plant }) => {
  return (
    <div className="plant-card">
      <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="plant-image">
          <PlantImage plant={plant} height={200} width="100%" />
        </div>
        <h3>{plant.name}</h3>
        <p className="plant-description">
          {plant.shortDescription || (plant.description ? plant.description.substring(0, 200) + (plant.description.length > 200 ? '...' : '') : '')}
        </p>
      </Link>
      <div className="plant-actions">
        <Link to={`/plant/${plant.id}`} className="plant-view">View</Link>
      </div>
    </div>
  );
};

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
    console.error("Home component error caught:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong on the Home page.</h2>
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

function Home({ isFirstVisit }) {
  const [showHero, setShowHero] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [featuredPlants, setFeaturedPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    // Instead of using state for the toast, dispatch a custom event
    const event = new CustomEvent('show-toast', {
      detail: {
        message: `${plant.name} has been added to your cart`,
        type: 'success',
        duration: 3000
      }
    });
    window.dispatchEvent(event);
  };
  
  return (
    <ErrorBoundary>
      <main className="homepage">
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
            <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>Featured</h2>
            <Link to="/shop" className="view-all-button">View All</Link>
          </div>
          
          {loading ? (
            <div className="loading">Loading featured plants...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="plant-grid">
              {featuredPlants.map(plant => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          )}
          
          {!loading && !error && (
            <div className="featured-plants-footer" style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link to="/shop" className="view-all-button">View All</Link>
            </div>
          )}
        </section>
      </main>
    </ErrorBoundary>
  );
}

export default Home; 