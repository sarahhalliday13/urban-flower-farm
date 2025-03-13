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
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ApiDebugger from './components/ApiDebugger';
import FirebaseMigration from './components/FirebaseMigration';
import FirebaseTest from './components/FirebaseTest';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './cart-styles.css';

function Navigation({ isMenuOpen, setIsMenuOpen }) {
  // eslint-disable-next-line no-unused-vars
  const { getItemCount, cartItems } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [, forceUpdate] = useState();
  const [hasOrders, setHasOrders] = useState(false);
  
  // Calculate cart count using getItemCount function
  const cartCount = getItemCount();

  // Check if user has orders
  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    if (userEmail && orders.length > 0) {
      // Check if any orders belong to this user
      const userOrders = orders.filter(
        order => order.customer.email.toLowerCase() === userEmail.toLowerCase()
      );
      setHasOrders(userOrders.length > 0);
    } else {
      setHasOrders(false);
    }
  }, []);

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

  // Determine the current page for active tab highlighting
  const currentPath = window.location.pathname;

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
        
        {/* Customer Navigation Links */}
        <div className="nav-section customer-links">
          <Link to="/shop" onClick={() => setIsMenuOpen(false)}>Shop</Link>
          {!isAuthenticated && (
            <>
              <Link to="/about" onClick={() => setIsMenuOpen(false)}>About Us</Link>
              <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
            </>
          )}
          {hasOrders && (
            <Link to="/orders" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
          )}
        </div>
        
        {/* Admin Navigation Links */}
        {isAuthenticated && (
          <>
            <div className="nav-divider"></div>
            <div className="nav-section admin-links">
              <span className="section-label">Admin</span>
              <Link 
                to="/admin" 
                onClick={() => setIsMenuOpen(false)} 
                className={`admin-link ${currentPath === '/admin' ? 'active' : ''}`}
              >
                Dashboard
              </Link>
              <Link 
                to="/inventory" 
                onClick={() => setIsMenuOpen(false)} 
                className={`admin-link ${currentPath === '/inventory' ? 'active' : ''}`}
              >
                Inventory
              </Link>
              <Link 
                to="/admin/orders" 
                onClick={() => setIsMenuOpen(false)} 
                className={`admin-link ${currentPath === '/admin/orders' ? 'active' : ''}`}
              >
                Orders
              </Link>
              <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="logout-button">Logout</button>
            </div>
          </>
        )}
      </div>
      {!isAuthenticated && (
        <button className="cart-button" onClick={toggleCart}>
          🪴
          {cartCount > 0 && (
            <div className="cart-badge">
              <span className="cart-count">{cartCount}</span>
            </div>
          )}
        </button>
      )}
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </nav>
  );
}

function App() {
  const [showModal, setShowModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showDebugger, setShowDebugger] = useState(false); // Set to false to hide the debugger
  
  useEffect(() => {
    // Always set hasVisited to true to ensure hero panel stays hidden
    localStorage.setItem('hasVisited', 'true');
    
    // Track page views
    const pageViews = parseInt(localStorage.getItem('pageViews') || '0');
    localStorage.setItem('pageViews', (pageViews + 1).toString());

    // Newsletter popup temporarily disabled
    // Original code:
    // if (pageViews === 2) { // Show on 3rd view (0-based counter)
    //   setShowModal(true);
    // }
    setShowModal(false); // Keep popup disabled for now
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
              <Route path="/firebase-test" element={<FirebaseTest />} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
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
              <Route 
                path="/firebase-migration" 
                element={
                  <ProtectedRoute>
                    <FirebaseMigration />
                  </ProtectedRoute>
                } 
              />
            </Routes>

            <footer>
              <p>© 2024 Buttons Urban Flower Farm. All rights reserved.</p>
            </footer>

            <NewsletterModal isOpen={showModal} onClose={() => setShowModal(false)} />
            
            {/* API Debugger component */}
            {showDebugger && <ApiDebugger />}
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
