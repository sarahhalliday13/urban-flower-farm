import './App.css';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import NewsletterModal from './components/NewsletterModal';
import About from './components/About';
import Shop from './components/Shop';
import CartModal from './components/CartModal';
import PlantDetails from './components/PlantDetails';
import Home from './components/Home';
import Login from './components/Login';
import Checkout from './components/Checkout';
import Orders from './components/Orders';
import Contact from './components/Contact';
import ProtectedRoute from './components/ProtectedRoute';
import ApiDebugger from './components/ApiDebugger';
import FirebaseMigration from './components/FirebaseMigration';
import FirebaseTest from './components/FirebaseTest';
import ToastManager from './components/ToastManager';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import './cart-styles.css';

// Lazy load heavy admin components
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminOrders = lazy(() => import('./components/AdminOrders'));

// Custom NavigationLink component for admin links
function AdminNavLink({ to, children, currentPath, onClick }) {
  // Dashboard link should be active only if the path is exactly '/admin'
  // Other links should match their exact paths
  const isActive = to === '/admin' 
    ? currentPath === '/admin'
    : currentPath === to;
    
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`admin-link ${isActive ? 'active' : ''}`}
    >
      {children}
    </Link>
  );
}

// Base Navigation component without router
function BaseNavigation({ isMenuOpen, setIsMenuOpen, currentPath }) {
  const { getItemCount } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [, forceUpdate] = useState();
  const [hasOrders, setHasOrders] = useState(false);
  
  // Calculate cart count using getItemCount function
  const cartCount = getItemCount();

  // Function to check if user has orders
  const checkForUserOrders = () => {
    const userEmail = localStorage.getItem('userEmail');
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    if (userEmail && orders.length > 0) {
      // Check if any orders belong to this user
      const userOrders = orders.filter(
        order => order.customer?.email?.toLowerCase() === userEmail.toLowerCase()
      );
      setHasOrders(userOrders.length > 0);
    } else {
      setHasOrders(false);
    }
  };

  // Check for orders when component mounts and when auth state changes
  useEffect(() => {
    checkForUserOrders();
  }, [isAuthenticated]);
  
  // Listen for the 'orderCreated' event to update the orders display
  useEffect(() => {
    const handleOrderCreated = () => {
      checkForUserOrders();
    };
    
    // Add event listener for custom orderCreated event
    window.addEventListener('orderCreated', handleOrderCreated);
    
    // Clean up
    return () => {
      window.removeEventListener('orderCreated', handleOrderCreated);
    };
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
              <AdminNavLink 
                to="/admin" 
                currentPath={currentPath}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </AdminNavLink>
              <AdminNavLink 
                to="/inventory" 
                currentPath={currentPath}
                onClick={() => setIsMenuOpen(false)}
              >
                Inventory
              </AdminNavLink>
              <AdminNavLink 
                to="/admin/orders" 
                currentPath={currentPath}
                onClick={() => setIsMenuOpen(false)}
              >
                Order Management
              </AdminNavLink>
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

// Navigation component that uses the router - ensure it's wrapped in the Router component 
const NavigationWithRouter = ({ isMenuOpen, setIsMenuOpen }) => {
  const location = useLocation();
  return <BaseNavigation isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} currentPath={location.pathname} />;
};

// Create a wrapper for admin content that doesn't show a loading state
const AdminContentWrapper = ({ children }) => {
  return (
    <div className="admin-content-area">
      <Suspense fallback={<div style={{ display: 'none' }}></div>}>
        {children}
      </Suspense>
    </div>
  );
};

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
        <AdminProvider>
          <Router>
            <div className="App">
              <header className="App-header">
                <NavigationWithRouter isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
              </header>
              
              <Routes>
                <Route path="/" element={<Home isFirstVisit={isFirstVisit} />} />
                <Route path="/about" element={<About />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/plant/:id" element={<PlantDetails />} />
                <Route path="/login" element={<Login />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/checkout/confirmation" element={<Checkout />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/firebase-test" element={<FirebaseTest />} />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <AdminContentWrapper>
                        <AdminDashboard />
                      </AdminContentWrapper>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/inventory" 
                  element={
                    <ProtectedRoute>
                      <AdminContentWrapper>
                        <InventoryManager />
                      </AdminContentWrapper>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/orders" 
                  element={
                    <ProtectedRoute>
                      <AdminContentWrapper>
                        <AdminOrders />
                      </AdminContentWrapper>
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
              
              {/* Toast notifications */}
              <ToastManager />
            </div>
          </Router>
        </AdminProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
