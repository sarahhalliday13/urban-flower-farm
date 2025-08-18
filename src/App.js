import './App.css';
import React, { useState, useEffect } from 'react';
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
import { ToastProvider } from './components/ToastManager';
// Import Toaster from react-hot-toast
import { Toaster } from 'react-hot-toast';
// eslint-disable-next-line no-unused-vars
import { CartProvider, useCart } from './context/CartContext';
// eslint-disable-next-line no-unused-vars
import { AuthProvider, useAuth } from './context/AuthContext';
// eslint-disable-next-line no-unused-vars
import { AdminProvider } from './context/AdminContext';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import './cart-styles.css';
import HowTo from './components/HowTo';
import UpdatesPage from './components/UpdatesPage';
import AdminUpdates from './components/AdminUpdates';
import CartModal from './components/CartModal';
// eslint-disable-next-line no-unused-vars
import { ScrollRestorationProvider } from './hooks/ScrollRestorationContext';
import BackToTop from './components/BackToTop';
import DatabaseDebug from './DatabaseDebug';
import ErrorBoundary from './components/ErrorBoundary';
// Import admin components directly instead of lazy loading
// import InventoryManager from './components/InventoryManager';
import ModularInventoryManager from './components/inventory/ModularInventoryManager';
import AdminDashboard from './components/AdminDashboard';
// import AdminOrders from './components/AdminOrders';
import { ModularOrderManager } from './components/orders/index';
import { ModularPlantEditor } from './components/plant-editor';
import InvoicePage from './pages/InvoicePage';
import InventoryImportExport from './components/InventoryImportExport';
import ImageRecovery from './components/ImageRecovery';

// Initialize Firebase Anonymous Auth
const auth = getAuth();
signInAnonymously(auth)
  .then(() => {
    console.log('✅ Anonymous auth successful');
  })
  .catch((error) => {
    console.error('❌ Anonymous auth failed:', error.message);
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('🆔 Firebase user ID:', user.uid);
  } else {
    console.warn('⚠️ Not authenticated!');
  }
});

// Custom wrapper for plant details
const PlantDetailsWrapper = ({ children }) => {
  return (
    <div className="plant-details-section">
      <div className="shop-main" style={{ 
        width: "100%", 
        maxWidth: "1200px", 
        margin: "0 auto", 
        padding: "16px 1rem 2rem 1rem",
        boxSizing: "border-box" 
      }}>
        {children}
      </div>
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
  
  // Calculate cart count using getItemCount function
  const cartCount = getItemCount();

  // Function to check if user has orders
  const checkForUserOrders = () => {
    // This function now just checks for user orders but doesn't set state
    const userEmail = localStorage.getItem('userEmail');
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    if (userEmail && orders.length > 0) {
      // Check if any orders belong to this user
      const userOrders = orders.filter(
        order => order.customer?.email?.toLowerCase() === userEmail.toLowerCase()
      );
      return userOrders.length > 0;
    } else {
      return false;
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
              <Link to="/how-to" onClick={() => setIsMenuOpen(false)}>How-To</Link>
              <Link to="/about" onClick={() => setIsMenuOpen(false)}>About</Link>
              <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
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

const AdminContentWrapper = ({ children }) => {
  const [error, setError] = useState(null);
  
  const handleError = (error, errorInfo) => {
    console.error('Error in admin component:', error, errorInfo);
    
    // Add specifics for chunk loading errors
    if (error && error.message && error.message.includes('Loading chunk')) {
      console.error('Chunk loading error detected in admin component:', error.message);
      setError({
        title: 'Resource Loading Error',
        message: 'The application failed to load a required component. This could be due to network issues or a temporary server problem.',
        originalError: error
      });
      
      // Report the error for monitoring
      if (window.reportError) {
        window.reportError('chunk_load_fail', error.message);
      }
    } else {
      setError({
        title: 'Something went wrong',
        message: 'There was an error loading this admin section. Please try again later.',
        originalError: error
      });
    }
  };
  
  // If there's an error, show a custom error UI
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#d32f2f' }}>{error.title}</h2>
        <p>{error.message}</p>
        
        <div style={{ margin: '20px 0' }}>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#2c5530',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              margin: '0 10px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
          
          <button 
            onClick={() => window.location.href = '/'} 
            style={{
              background: '#777',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              margin: '0 10px',
              cursor: 'pointer'
            }}
          >
            Return Home
          </button>
        </div>
        
        <details style={{ marginTop: '30px', textAlign: 'left', fontSize: '0.8em', color: '#666' }}>
          <summary>Technical Details</summary>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {error.originalError && (error.originalError.stack || error.originalError.message || JSON.stringify(error.originalError))}
          </pre>
        </details>
      </div>
    );
  }
  
  return (
    <div className="admin-content-area">
      <ErrorBoundary onError={handleError}>
        {children}
      </ErrorBoundary>
    </div>
  );
};

// Separate component for the app content that can safely use hooks within the providers
function AppContent() {
  // Add state for mobile menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
        <Route path="/how-to" element={<HowTo />} />
        <Route path="/plant/:id" element={
          <PlantDetailsWrapper>
            <PlantDetails />
          </PlantDetailsWrapper>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/confirmation" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/invoice/:orderId" element={<InvoicePage />} />
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
                <ModularInventoryManager />
              </AdminContentWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/editplant/:id" 
          element={
            <ProtectedRoute>
              <AdminContentWrapper>
                <ModularPlantEditor />
              </AdminContentWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/addplant" 
          element={
            <ProtectedRoute>
              <AdminContentWrapper>
                <ModularPlantEditor />
              </AdminContentWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/orders" 
          element={
            <ProtectedRoute>
              <AdminContentWrapper>
                <ModularOrderManager />
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
        <Route
          path="/admin/import-export"
          element={
            <ProtectedRoute>
              <AdminContentWrapper>
                <InventoryImportExport />
              </AdminContentWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/image-recovery"
          element={
            <ProtectedRoute>
              <AdminContentWrapper>
                <ImageRecovery />
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
          <Link to="/how-to">How-To</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/admin">Manage</Link>
        </div>
        <p>© 2025 Buttons Urban Flower Farm. All rights reserved.</p>
      </footer>
      
      {/* Toast container is now provided by the ToastProvider */}
    </div>
  );
}

// Wrap AppContent with ScrollRestorationProvider and ToastProvider
const App = () => (
  <Router>
    <ScrollRestorationProvider>
      <AuthProvider>
        <CartProvider>
          <AdminProvider>
            <ToastProvider>
              <Toaster 
                position="top-center" 
                reverseOrder={false}
                toastOptions={{
                  success: {
                    iconTheme: {
                      primary: 'transparent',
                      secondary: 'transparent',
                    },
                  },
                }}
              />
              <AppContent />
            </ToastProvider>
          </AdminProvider>
        </CartProvider>
      </AuthProvider>
    </ScrollRestorationProvider>
  </Router>
);

export default App;
