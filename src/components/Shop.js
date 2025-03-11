import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Shop.css';
import { useCart } from '../context/CartContext';
import { fetchProductsWithInventory } from '../services/sheets';

function Shop() {
  const { addToCart } = useCart();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPlants = async () => {
      try {
        const data = await fetchProductsWithInventory();
        setPlants(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load plants. Please try again later.');
        setLoading(false);
      }
    };

    loadPlants();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <main>
      <section className="shop-hero">
        <div className="hero-content">
          <h1>Shop Our Plants</h1>
          <p>Discover our collection of beautiful, sustainably grown plants</p>
        </div>
      </section>

      <section className="featured-plants">
        <div className="plant-grid">
          {plants.map(plant => (
            <div key={plant.id} className="plant-card">
              <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="plant-image">
                  <img src={plant.mainImage} alt={plant.name} />
                </div>
                <h3>{plant.name}</h3>
                <p>${plant.price}</p>
                {plant.inventory && (
                  <div className="plant-status">
                    <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(' ', '-')}`}>
                      {plant.inventory.status}
                    </span>
                  </div>
                )}
              </Link>
              <div className="plant-actions">
                <Link to={`/plant/${plant.id}`} className="plant-view">View</Link>
                <button 
                  className="plant-buy" 
                  onClick={() => addToCart(plant)}
                  disabled={plant.inventory?.currentStock === 0}
                >
                  {plant.inventory?.currentStock > 0 ? 'Buy' : 'Sold Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Shop; 