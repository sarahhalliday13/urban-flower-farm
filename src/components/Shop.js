import React from 'react';
import { Link } from 'react-router-dom';
import './Shop.css';
import { useCart } from '../context/CartContext';

function Shop() {
  const { addToCart } = useCart();
  
  const plants = {
    1: {
      id: 1,
      name: 'Lavender Mist',
      commonName: 'French Meadow Rue',
      latinName: 'Thalictrum rochebruneanum',
      price: 10,
      image: '/images/LavenderMist.jpg'
    },
    2: {
      id: 2,
      name: "Palmer's Beardtongue",
      commonName: 'Palmer Penstemon, Pink Wild Snapdragon, Scented Penstemon',
      latinName: 'Penstemon palmeri',
      price: 10,
      image: '/images/penstemonpalmeri.jpg'
    },
    4: {
      id: 4,
      name: 'Gaillardia Pulchella Mix',
      commonName: 'Indian Blanket, Firewheel, Blanketflower',
      latinName: 'Gaillardia pulchella',
      price: 6,
      image: '/images/gaillardiapulchella.jpg'
    }
  };

  return (
    <main>
      <section className="shop-hero">
        <div className="hero-content">
          <h1><Link to="/">Button's Urban Flower Farm</Link></h1>
          <p>Discover our collection of beautiful, sustainably grown plants</p>
        </div>
      </section>

      <section className="featured-plants">
        <div className="plant-grid">
          {Object.values(plants).map(plant => (
            <div key={plant.id} className="plant-card">
              <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="plant-image">
                  <img src={plant.image} alt={plant.name} />
                </div>
                <h3>{plant.name}</h3>
                <p>${plant.price}</p>
              </Link>
              <div className="plant-actions">
                <Link to={`/plant/${plant.id}`} className="plant-view">View</Link>
                <button className="plant-buy" onClick={() => addToCart({ id: plant.id, name: plant.name, price: plant.price, image: plant.image })}>
                  Buy
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