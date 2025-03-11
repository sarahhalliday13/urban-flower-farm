import './App.css';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import NewsletterModal from './components/NewsletterModal';
import About from './components/About';
import Shop from './components/Shop';
import CartModal from './components/CartModal';
import PlantDetails from './components/PlantDetails';
import { CartProvider, useCart } from './context/CartContext';

function CartIcon() {
  const { getItemCount } = useCart();
  const [showCart, setShowCart] = useState(false);
  const itemCount = getItemCount();

  return (
    <>
      <button className="cart-icon" onClick={() => setShowCart(true)}>
        🪴
        {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
      </button>
      <CartModal isOpen={showCart} onClose={() => setShowCart(false)} />
    </>
  );
}

function Home({ isFirstVisit }) {
  const [showHero, setShowHero] = useState(true);

  useEffect(() => {
    const heroHidden = localStorage.getItem('heroHidden');
    if (heroHidden === 'true') {
      setShowHero(false);
    }
  }, []);

  const hideHero = () => {
    setShowHero(false);
    localStorage.setItem('heroHidden', 'true');
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
          <h2>Featured Plants</h2>
          <Link to="/shop" className="view-all-link">View All Plants</Link>
        </div>
        <div className="plant-grid">
          <div className="plant-card">
            <Link to="/plant/1" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="plant-image">
                <img src="/images/LavenderMist.jpg" alt="Lavender Mist" />
              </div>
              <h3>Lavender Mist</h3>
              <p className="plant-description">Magnificent sprays of delicate, lavender-purple flowers on tall stems. Perfect for adding height and airy texture to your garden.</p>
            </Link>
            <div className="plant-actions">
              <Link to="/plant/1" className="plant-view">View Details</Link>
            </div>
          </div>
          <div className="plant-card">
            <Link to="/plant/2" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="plant-image">
                <img src="/images/penstemonpalmeri.jpg" alt="Palmer's Beardtongue" />
              </div>
              <h3>Palmer's Beardtongue</h3>
              <p className="plant-description">Tall stalks of fragrant, light pink flowers that smell like grapes. A favorite among hummingbirds and perfect for bouquets.</p>
            </Link>
            <div className="plant-actions">
              <Link to="/plant/2" className="plant-view">View Details</Link>
            </div>
          </div>
          <div className="plant-card">
            <Link to="/plant/4" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="plant-image">
                <img src="/images/gaillardiapulchella.jpg" alt="Gaillardia Pulchella Mix" />
              </div>
              <h3>Gaillardia Pulchella Mix</h3>
              <p className="plant-description">Vibrant, daisy-like flowers in warm sunset colors. Drought-tolerant and beloved by pollinators, blooming all summer long.</p>
            </Link>
            <div className="plant-actions">
              <Link to="/plant/4" className="plant-view">View Details</Link>
            </div>
          </div>
        </div>
        <div className="featured-plants-footer">
          <Link to="/shop" className="view-all-link">View All Plants</Link>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [showModal, setShowModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    // Check if this is the first visit for hero visibility
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      localStorage.setItem('hasVisited', 'true');
      setIsFirstVisit(true);
    } else {
      setIsFirstVisit(false);
    }

    // Track page views
    const pageViews = parseInt(localStorage.getItem('pageViews') || '0');
    localStorage.setItem('pageViews', (pageViews + 1).toString());

    // Show newsletter after 3 page views
    if (pageViews === 2) { // Show on 3rd view (0-based counter)
      setShowModal(true);
    }
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <CartProvider>
      <Router>
        <div className="App">
          <header className="App-header">
            <nav className="navbar">
              <button className="hamburger-menu" onClick={toggleMenu}>
                ☰
              </button>
              <Link to="/" className="logo">Buttons Urban Flower Farm</Link>
              <div className={`nav-links ${isMenuOpen ? 'nav-open' : ''}`}>
                <button className="nav-close" onClick={() => setIsMenuOpen(false)}>
                  ×
                </button>
                <Link to="/shop" onClick={() => setIsMenuOpen(false)}>Shop</Link>
                <Link to="/about" onClick={() => setIsMenuOpen(false)}>About Us</Link>
                <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
              </div>
              <CartIcon />
            </nav>
          </header>
          
          <Routes>
            <Route path="/" element={<Home isFirstVisit={isFirstVisit} />} />
            <Route path="/about" element={<About />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/contact" element={<div>Contact Page Coming Soon</div>} />
            <Route path="/plant/:id" element={<PlantDetails />} />
          </Routes>

          <footer>
            <p>© 2024 Buttons Urban Flower Farm. All rights reserved.</p>
          </footer>

          <NewsletterModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
