import './App.css';
import React, { useState, useEffect, lazy, Suspense } from 'react';
// eslint-disable-next-line no-unused-vars
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import About from './components/About';
import Shop from './components/Shop';
import PlantDetails from './components/PlantDetails';
import Home from './components/Home';
import Login from './components/Login';
import Checkout from './components/Checkout';
import Orders from './components/Orders';
import Contact from './components/Contact';
import ProtectedRoute from './components/ProtectedRoute';
import ToastManager from './components/ToastManager';
// eslint-disable-next-line no-unused-vars
import { CartProvider, useCart } from './context/CartContext';
// eslint-disable-next-line no-unused-vars
import { AuthProvider, useAuth } from './context/AuthContext';
// eslint-disable-next-line no-unused-vars
import { AdminProvider } from './context/AdminContext';
import './cart-styles.css';
import FAQ from './components/FAQ';
import UpdatesPage from './components/UpdatesPage';
import AdminUpdates from './components/AdminUpdates';
import CartModal from './components/CartModal';
// eslint-disable-next-line no-unused-vars
import { ScrollRestorationProvider } from './hooks/ScrollRestorationContext';
import BackToTop from './components/BackToTop';
import DatabaseDebug from './DatabaseDebug';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load heavy admin components
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminOrders = lazy(() => import('./components/AdminOrders'));
const AdminUtilities = lazy(() => import('./components/AdminUtilities'));

// Custom wrapper for plant details
const PlantDetailsWrapper = ({ children }) => {
  return (
    <div className="plant-details-section">
      {children}
    </div>
  );
};

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
      <Link to="/" className="logo" onClick={() => setIsMenuOpen(false)}>
        <img 
          src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/logo%2Fbuff_floral_lg.png?alt=media&token=3dfddfc2-6579-4541-acc3-6e3a02aea0b5" 
          alt="Buttons Urban Flower Farm" 
          className="logo-image"
          draggable="false"
        />
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
              <Link to="/updates" onClick={() => setIsMenuOpen(false)}>News</Link>
              <Link to="/faq" onClick={() => setIsMenuOpen(false)}>FAQ</Link>
              <Link to="/about" onClick={() => setIsMenuOpen(false)}>About</Link>
              <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
              {hasOrders && (
                <Link to="/orders" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
              )}
            </>
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
                to="/admin/orders" 
                currentPath={currentPath}
                onClick={() => setIsMenuOpen(false)}
              >
                Orders
              </AdminNavLink>
              <AdminNavLink 
                to="/admin/inventory" 
                currentPath={currentPath}
                onClick={() => setIsMenuOpen(false)}
              >
                Inventory
              </AdminNavLink>
              <AdminNavLink 
                to="/admin/updates" 
                currentPath={currentPath}
                onClick={() => setIsMenuOpen(false)}
              >
                News
              </AdminNavLink>
              <AdminNavLink 
                to="/admin/utilities" 
                currentPath={currentPath}
                onClick={() => setIsMenuOpen(false)}
              >
                Utilities
              </AdminNavLink>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        )}
      </div>
      <button className="cart-button" onClick={toggleCart}>
        <span role="img" aria-label="plant emoji">🪴</span>
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

// Navigation component that uses the router - ensure it's wrapped in the Router component 
const NavigationWithRouter = ({ isMenuOpen, setIsMenuOpen }) => {
  const location = useLocation();
  return <BaseNavigation isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} currentPath={location.pathname} />;
};

// Create a wrapper for admin content with enhanced error handling
const AdminContentWrapper = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Error boundary functionality
  const handleError = (error) => {
    console.error('Error in AdminContentWrapper:', error);
    setHasError(true);
    setErrorMessage(error.message || 'An unexpected error occurred');
  };
  
  // If there's an error, show it
  if (hasError) {
    return (
      <div className="admin-error" style={{ 
        padding: '20px', 
        margin: '20px auto',
        maxWidth: '800px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#d32f2f' }}>Error Loading Admin Content</h2>
        <p>{errorMessage}</p>
        <button 
          onClick={() => setHasError(false)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2c5530',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="admin-content-area">
      <ErrorBoundary onError={handleError}>
        <Suspense fallback={
          <div className="admin-loading" style={{ 
            padding: '20px', 
            textAlign: 'center' 
          }}>
            <div className="loading-spinner" style={{
              display: 'inline-block',
              width: '30px',
              height: '30px',
              border: '3px solid rgba(0,0,0,0.1)',
              borderRadius: '50%',
              borderTopColor: '#2c5530',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p>Loading admin content...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        }>
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

// Separate component for the app content that can safely use hooks within the providers
function AppContent() {
  // Now useAuth is safely inside the AuthProvider
  const { isAuthenticated: isAdmin } = useAuth();
  const [hasOrders, setHasOrders] = useState(false);
  // Add state for mobile menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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

  // Check for orders when component mounts
  useEffect(() => {
    checkForUserOrders();
  }, []);
  
  // Listen for the 'orderCreated' event to update the orders display
  useEffect(() => {
    const handleOrderCreated = () => {
      checkForUserOrders();
    };
    
    window.addEventListener('orderCreated', handleOrderCreated);
    return () => window.removeEventListener('orderCreated', handleOrderCreated);
  }, []);
  
  return (
    <div className="App">
      <header className="App-header">
        <NavigationWithRouter isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      </header>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/plant/:id" element={
          <PlantDetailsWrapper>
            <PlantDetails />
          </PlantDetailsWrapper>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/confirmation" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
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
          path="/admin/inventory" 
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
          path="/admin/utilities"
          element={
            <ProtectedRoute>
              <AdminContentWrapper>
                <AdminUtilities />
              </AdminContentWrapper>
            </ProtectedRoute>
          }
        />
        <Route 
          path="/admin/updates"
          element={
            <ProtectedRoute>
              <AdminContentWrapper>
                <AdminUpdates />
              </AdminContentWrapper>
            </ProtectedRoute>
          }
        />
        <Route path="/updates" element={<UpdatesPage />} />
        <Route path="/debug-database" element={<DatabaseDebug />} />
      </Routes>

      <BackToTop />

      <footer>
        <div className="footer-links">
          <Link to="/shop">Shop</Link>
          <Link to="/updates">News</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          {hasOrders && <Link to="/orders">My Orders</Link>}
          <Link to="/admin">Manage</Link>
        </div>
        <p>© 2025 Buttons Urban Flower Farm. All rights reserved.</p>
      </footer>
      
      {/* Toast notifications */}
      <ToastManager />
    </div>
  );
}

// Wrap AppContent with ScrollRestorationProvider
const App = () => (
  <Router>
    <ScrollRestorationProvider>
      <AuthProvider>
        <CartProvider>
          <AdminProvider>
            <AppContent />
          </AdminProvider>
        </CartProvider>
      </AuthProvider>
    </ScrollRestorationProvider>
  </Router>
);

export default App;
