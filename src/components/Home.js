import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPlants, loadSamplePlants } from '../services/firebase';
import { useCart } from '../context/CartContext';

// Plant Card component to properly handle state for each card
const PlantCard = ({ plant }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // For specific plants, directly use the Firebase URL with token
  let initialSrc = plant.mainImage || '/images/placeholder.jpg';
  if (plant.name === "Palmer's Beardtongue") {
    initialSrc = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
    console.log('HARD-CODED PALMER URL:', initialSrc);
  } else if (plant.name === "Gaillardia Pulchella Mix") {
    initialSrc = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
    console.log('HARD-CODED GAILLARDIA URL:', initialSrc);
  }
  
  const [imageSrc, setImageSrc] = useState(initialSrc);
  
  // Debug log for plants with Firebase URLs
  useEffect(() => {
    if (plant.name === "Palmer's Beardtongue" || plant.name === "Gaillardia Pulchella Mix") {
      console.log(`RENDERING ${plant.name.toUpperCase()} IN HOME:`, {
        name: plant.name,
        id: plant.id,
        mainImage: plant.mainImage,
        initialImageSrc: imageSrc,
        hasValidImage: !!plant.mainImage,
        imageType: typeof plant.mainImage,
        isLoaded: imageLoaded
      });
    }
  }, [plant, imageSrc, imageLoaded]);

  return (
    <div className="plant-card">
      {(plant.name === "Palmer's Beardtongue" || plant.name === "Gaillardia Pulchella Mix") && (
        <div style={{position: 'absolute', top: '5px', right: '5px', zIndex: 100}}>
          <button onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = plant.name === "Palmer's Beardtongue" 
              ? "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739"
              : "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
            window.open(url, "_blank");
          }} style={{background: 'red', color: 'white', border: 'none', padding: '5px', borderRadius: '3px', fontSize: '10px'}}>
            Test Firebase URL
          </button>
        </div>
      )}
      <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="plant-image">
          {!imageLoaded && 
            <div className="image-placeholder" style={{
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
              console.log('Image loaded successfully:', plant.name);
              setImageLoaded(true);
            }}
            onError={(e) => {
              console.error('Image failed to load:', imageSrc);
              
              // If this is the first error and it's a Firebase URL, try with cache buster
              if (!imageSrc.includes('&t=') && 
                  imageSrc.includes('firebasestorage')) {
                
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
  );
};

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
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Home; 