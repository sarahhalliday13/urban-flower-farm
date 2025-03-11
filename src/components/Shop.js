import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Shop.css';
import { useCart } from '../context/CartContext';
import { fetchPlants } from '../services/sheets';
import Toast from './Toast';

function Shop() {
  const { addToCart } = useCart();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const loadPlants = async () => {
      try {
        console.log('Fetching plants...');
        const data = await fetchPlants();
        console.log('Fetched plants:', data);
        if (!data || data.length === 0) {
          setError('No plants found');
          return;
        }
        setPlants(data);
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

  if (loading) return <div className="loading">Loading plants...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!plants || plants.length === 0) return <div className="error">No plants available</div>;

  return (
    <div className="shop-main">
      <section className="featured-plants">
        <div className="featured-plants-header">
          <h2>All the Flowers</h2>
        </div>
        <div className="plant-grid">
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
                  <h3>{plant.name}</h3>
                  <p>${plant.price}</p>
                  <div className="plant-status">
                    <span className={`status-badge ${plant.inventory?.status?.toLowerCase().replace(' ', '-') || 'unknown'}`}>
                      {plant.inventory?.status || 'Status Unknown'}
                    </span>
                  </div>
                </Link>
                <div className="plant-actions">
                  <Link to={`/plant/${plant.id}`} className="plant-view">View</Link>
                  <button 
                    className="plant-buy" 
                    onClick={() => handleAddToCart(plant)}
                    disabled={!plant.inventory?.currentStock}
                  >
                    {plant.inventory?.currentStock > 0 ? 'Add to Cart' : 'Sold Out'}
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