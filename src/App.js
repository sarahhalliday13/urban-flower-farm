import './App.css';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import NewsletterModal from './components/NewsletterModal';
import About from './components/About';
import Shop from './components/Shop';
import CartModal from './components/CartModal';
import PlantDetails from './components/PlantDetails';
import Home from './components/Home';
import InventoryManager from './components/InventoryManager';
import Login from './components/Login';
import Checkout from './components/Checkout';
import Orders from './components/Orders';
import AdminOrders from './components/AdminOrders';
import ProtectedRoute from './components/ProtectedRoute';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './cart-styles.css';

function Navigation({ isMenuOpen, setIsMenuOpen }) {
  const { getItemCount, cartItems } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [, forceUpdate] = useState();
  
  // Calculate cart count using getItemCount function
  const cartCount = getItemCount();

  // Force re-render when cart count changes
  useEffect(() => {
    // This empty dependency array ensures the effect runs when cartCount changes
  }, [cartCount]);

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
    forceUpdate({});
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navbar">
      <button className="hamburger-menu" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        ☰
      </button>
      <Link to="/" className="logo">
        Buttons Urban Flower Farm
      </Link>
      <div className={`nav-links ${isMenuOpen ? 'nav-open' : ''}`}>
        <button className="nav-close" onClick={() => setIsMenuOpen(false)}>
          ×
        </button>
        <Link to="/shop" onClick={() => setIsMenuOpen(false)}>Shop</Link>
        <Link to="/about" onClick={() => setIsMenuOpen(false)}>About Us</Link>
        <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
        {isAuthenticated && (
          <>
            <Link to="/inventory" onClick={() => setIsMenuOpen(false)} className="admin-link">Inventory</Link>
            <Link to="/admin/orders" onClick={() => setIsMenuOpen(false)} className="admin-link">Orders</Link>
            <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="logout-button">Logout</button>
          </>
        )}
      </div>
      <button className="cart-button" onClick={toggleCart}>
        🪴
        {cartCount > 0 && (
          <div className="cart-badge">
            <span className="cart-count">{cartCount}</span>
          </div>
        )}
      </button>
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </nav>
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

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <header className="App-header">
              <Navigation isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
            </header>
            
            <Routes>
              <Route path="/" element={<Home isFirstVisit={isFirstVisit} />} />
              <Route path="/about" element={<About />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/contact" element={<div>Contact Page Coming Soon</div>} />
              <Route path="/plant/:id" element={<PlantDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route 
                path="/inventory" 
                element={
                  <ProtectedRoute>
                    <InventoryManager />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/orders" 
                element={
                  <ProtectedRoute>
                    <AdminOrders />
                  </ProtectedRoute>
                } 
              />
            </Routes>

            <footer>
              <p>© 2024 Buttons Urban Flower Farm. All rights reserved.</p>
            </footer>

            <NewsletterModal isOpen={showModal} onClose={() => setShowModal(false)} />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
