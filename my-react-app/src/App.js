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

  return (
    <>
      <button className="cart-icon" onClick={() => setShowCart(true)}>
        Cart{getItemCount() > 0 ? ` (${getItemCount()})` : ''}
      </button>
      <CartModal isOpen={showCart} onClose={() => setShowCart(false)} />
    </>
  );
}

function Home() {
  const { addToCart } = useCart();
  
  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <h1>Welcome</h1>
          <p>Discover beautiful plants for your home and garden</p>
        </div>
      </section>

      <section className="featured-plants">
        <div className="featured-plants-header">
          <h2>Featured Plants</h2>
          <Link to="/shop" className="view-all-link">View All</Link>
        </div>
        <div className="plant-grid">
          <div className="plant-card">
            <Link to="/plant/1" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="plant-image">
                <img src="/images/LavenderMist.jpg" alt="Lavender Mist" />
              </div>
              <h3>Lavender Mist</h3>
              <p>$10</p>
            </Link>
            <div className="plant-actions">
              <Link to="/plant/1" className="plant-view">View</Link>
              <button className="plant-buy" onClick={() => addToCart({ id: 1, name: 'Lavender Mist', price: 10, image: '/images/LavenderMist.jpg' })}>Buy</button>
            </div>
          </div>
          <div className="plant-card">
            <Link to="/plant/2" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="plant-image">
                <img src="/images/penstemonpalmeri.jpg" alt="Palmer's Beardtongue" />
              </div>
              <h3>Palmer's Beardtongue</h3>
              <p>$10</p>
            </Link>
            <div className="plant-actions">
              <Link to="/plant/2" className="plant-view">View</Link>
              <button className="plant-buy" onClick={() => addToCart({ id: 2, name: "Palmer's Beardtongue", price: 10, image: '/images/penstemonpalmeri.jpg' })}>Buy</button>
            </div>
          </div>
          <div className="plant-card">
            <Link to="/plant/4" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="plant-image">
                <img src="/images/gaillardiapulchella.jpg" alt="Gaillardia Pulchella Mix" />
              </div>
              <h3>Gaillardia Pulchella Mix</h3>
              <p>$6</p>
            </Link>
            <div className="plant-actions">
              <Link to="/plant/4" className="plant-view">View</Link>
              <button className="plant-buy" onClick={() => addToCart({ id: 4, name: 'Gaillardia Pulchella Mix', price: 6, image: '/images/gaillardiapulchella.jpg' })}>Buy</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [showModal, setShowModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Check if this is the first visit
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setShowModal(true);
      localStorage.setItem('hasVisited', 'true');
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
              <div className="logo">Buttons Urban Flower Farm</div>
              <div className={`nav-links ${isMenuOpen ? 'nav-open' : ''}`}>
                <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
                <Link to="/shop" onClick={() => setIsMenuOpen(false)}>Shop</Link>
                <Link to="/about" onClick={() => setIsMenuOpen(false)}>About Us</Link>
                <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
              </div>
              <CartIcon />
            </nav>
          </header>
          
          <Routes>
            <Route path="/" element={<Home />} />
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
