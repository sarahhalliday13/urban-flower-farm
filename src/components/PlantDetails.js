import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Toast from './Toast';
import { fetchPlants, loadSamplePlants } from '../services/firebase';

function PlantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [newComment, setNewComment] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [quantity, setQuantity] = useState(() => {
    const savedQuantity = localStorage.getItem(`plant-${id}-quantity`);
    return savedQuantity ? parseInt(savedQuantity, 10) : 1;
  });
  const [comments, setComments] = useState([
    {
      id: 1,
      author: 'Sarah',
      date: '2024-03-15',
      content: 'This plant has been thriving in my living room! The care instructions were spot on.'
    }
  ]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add image loading state
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const placeholderImage = '/images/placeholder.jpg';

  // Fetch plants from Firebase with fallbacks
  useEffect(() => {
    const loadPlants = async () => {
      setLoading(true);
      
      // Create a timeout to handle cases where Firebase fetch hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase fetch timed out')), 5000);
      });
      
      try {
        // Race between the actual fetch and the timeout
        const data = await Promise.race([
          fetchPlants(),
          timeoutPromise
        ]);
        
        if (!data || data.length === 0) {
          console.log('No plants found in Firebase, trying sample data');
          const sampleData = await loadSamplePlants();
          if (sampleData.length === 0) {
            setError('No plants found');
            setLoading(false);
            return;
          }
          setPlants(sampleData);
        } else {
          setPlants(data);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching plants from Firebase:', err);
        try {
          // Try sample data if Firebase fetch fails
          const sampleData = await loadSamplePlants();
          setPlants(sampleData);
          setLoading(false);
        } catch (sampleErr) {
          console.error('Failed to load sample data:', sampleErr);
          setError(`Failed to load plants: ${err.message}`);
          setLoading(false);
        }
      }
    };

    loadPlants();
  }, []);

  // Find the current plant by ID
  const plant = plants.find(p => p.id === Number(id) || p.id === id);
  
  // Get all plant IDs for navigation
  const plantIds = plants.map(p => p.id);
  const currentIndex = plantIds.indexOf(Number(id) || id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < plantIds.length - 1;

  // Handle different image field names from spreadsheet and filter out any empty/null images
  // Create a complete array of valid images
  const getValidImages = () => {
    if (!plant) return [placeholderImage];
    
    // Start with the main image if it exists
    let allImages = [];
    
    // Add main image if it exists and isn't empty
    if (plant.mainImage && typeof plant.mainImage === 'string' && plant.mainImage.trim() !== '') {
      allImages.push(plant.mainImage);
    }
    
    // Add additional images if they exist
    if (plant.additionalImages && Array.isArray(plant.additionalImages)) {
      // Filter out empty strings and null values
      const validAdditionalImages = plant.additionalImages.filter(
        img => img && typeof img === 'string' && img.trim() !== ''
      );
      allImages = [...allImages, ...validAdditionalImages];
    } else if (plant.images && Array.isArray(plant.images)) {
      // Use images array if it exists (alternative format)
      const validImages = plant.images.filter(
        img => img && typeof img === 'string' && img.trim() !== ''
      );
      allImages = validImages;
    }
    
    // If no valid images were found, use placeholder
    return allImages.length > 0 ? allImages : [placeholderImage];
  };
  
  const images = getValidImages();

  // Preload images
  useEffect(() => {
    if (!plant) return;
    
    const imageObjects = images.map(src => {
      const img = new Image();
      img.src = src;
      img.onerror = () => console.log('Image failed to load:', src);
      return img;
    });
    
    // Mark images as loaded after a short delay, regardless of actual load status
    // This ensures we don't wait forever for broken images
    const timer = setTimeout(() => {
      setImagesLoaded(true);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      // Clean up image objects
      imageObjects.forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [plant, images]);

  const handleNavigation = (direction) => {
    // Reset image loaded state when navigating
    setImagesLoaded(false);
    setSelectedImageIndex(0);
    
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < plantIds.length) {
      navigate(`/plant/${plantIds[newIndex]}`);
      window.scrollTo(0, 0);
    }
  };

  const NavigationButtons = ({ className }) => (
    <div className={`plant-navigation ${className}`}>
      <div className="navigation-container">
        <div className="nav-view-all">
          <a href="/shop" className="view-all-link">View All</a>
        </div>
        <div className="nav-group">
          <button
            className="nav-button"
            onClick={() => handleNavigation('prev')}
            disabled={!hasPrevious}
          >
            Previous
          </button>
          <span className="nav-separator">|</span>
          <button
            className="nav-button"
            onClick={() => handleNavigation('next')}
            disabled={!hasNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  // Clear quantity when component unmounts
  useEffect(() => {
    return () => {
      if (!localStorage.getItem(`plant-${id}-quantity`)) {
        localStorage.setItem(`plant-${id}-quantity`, '1');
      }
    };
  }, [id]);

  if (loading) return <div className="loading">Loading plant details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!plant) return <div className="error">Plant not found</div>;

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      id: comments.length + 1,
      author: 'Guest',
      date: new Date().toISOString().split('T')[0],
      content: newComment.trim()
    };

    setComments([comment, ...comments]);
    setNewComment('');
  };

  const handleQuantityChange = (delta) => {
    setQuantity(prev => {
      const newQuantity = Math.max(1, prev + delta);
      localStorage.setItem(`plant-${id}-quantity`, newQuantity.toString());
      return newQuantity;
    });
  };

  const handleAddToCart = () => {
    addToCart(plant, quantity);
    setToastMessage(`${quantity} ${quantity === 1 ? 'item has' : 'items have'} been added to your cart`);
    setShowToast(true);
    setQuantity(1);
    localStorage.setItem(`plant-${id}-quantity`, '1');
  };

  // Log the images for debugging
  console.log('Plant images:', images);
  
  return (
    <main>
      <NavigationButtons className="top" />
      <div className="plant-details">
        <div className="plant-details-container">
          <div className="plant-details-gallery">
            <div className="plant-details-image">
              {/* Show default placeholder while custom loading state is active */}
              <img 
                src={imagesLoaded ? images[selectedImageIndex] : placeholderImage} 
                alt={plant.name}
                onError={(e) => {
                  console.error('Image failed to load:', images[selectedImageIndex]);
                  e.target.src = placeholderImage;
                }}
                style={{ opacity: imagesLoaded ? 1 : 0.6 }}
              />
              {!imagesLoaded && (
                <div className="image-loading-overlay">
                  <div className="loading-spinner"></div>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="image-thumbnails">
                {images.map((image, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img 
                      src={image} 
                      alt={`${plant.name} view ${index + 1}`}
                      onError={(e) => {
                        e.target.src = placeholderImage;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="plant-details-info">
            <h1>{plant.name}</h1>
            {plant.commonName && plant.scientificName && (
              <p className="plant-names">
                {plant.commonName} <span className="latin-name">({plant.scientificName})</span>
              </p>
            )}
            <div className="price-action-container">
              <p className="price">${plant.price}</p>
              <div className="price-controls">
                <div className="quantity-selector">
                  <button 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >-</button>
                  <span>{quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(1)}
                    disabled={plant.inventory?.maxOrderQuantity && quantity >= plant.inventory.maxOrderQuantity}
                  >+</button>
                </div>
                <button 
                  className="plant-buy"
                  onClick={handleAddToCart}
                  disabled={!plant.inventory?.currentStock || plant.inventory.currentStock <= 0}
                >
                  {plant.inventory?.currentStock > 0 ? 'Buy' : 'Sold Out'}
                </button>
              </div>
            </div>
            
            {/* Inventory Status Information */}
            <div className="inventory-status">
              {plant.inventory?.currentStock > 0 && (
                <div className="inventory-status-row">
                  <span className={`status-badge ${plant.inventory?.status?.toLowerCase().replace(' ', '-') || 'unknown'}`}>
                    In Stock
                  </span>
                  
                  <span className="stock-quantity">
                    {plant.inventory.currentStock} in stock
                  </span>
                </div>
              )}
              
              {plant.inventory?.restockDate && plant.inventory.currentStock <= 0 && (
                <span className="restock-date">
                  Expected restock: {plant.inventory.restockDate}
                </span>
              )}
              
              {plant.inventory?.notes && (
                <p className="inventory-notes">{plant.inventory.notes}</p>
              )}
            </div>
            
            <p className="description">{plant.description}</p>
            <div className="plant-specs">
              <h3>Plant Specifications</h3>
              {plant.bloomSeason && <p><strong>Bloom Season:</strong> {plant.bloomSeason}</p>}
              {plant.colour && <p><strong>Colour:</strong> {plant.colour}</p>}
              {plant.light && <p><strong>Light:</strong> {plant.light}</p>}
              {plant.spacing && <p><strong>Spacing:</strong> {plant.spacing}</p>}
              {plant.attributes && <p><strong>Attributes:</strong> {plant.attributes}</p>}
              {plant.hardinessZone && <p><strong>Hardiness Zone:</strong> {plant.hardinessZone}</p>}
              {plant.height && <p><strong>Height:</strong> {plant.height}</p>}
            </div>
          </div>
        </div>

        {/* Customer comments section hidden temporarily
        <div className="comments-section">
          <h2>Customer Comments</h2>
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your comment..."
              required
            />
            <button type="submit">Post Comment</button>
          </form>

          <div className="comments-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span>{comment.author}</span>
                  <span>{comment.date}</span>
                </div>
                <p>{comment.text}</p>
              </div>
            ))}
          </div>
        </div>
        */}
      </div>
      <NavigationButtons className="bottom" />
      {showToast && (
        <Toast 
          message={toastMessage} 
          onClose={() => setShowToast(false)} 
        />
      )}
    </main>
  );
}

export default PlantDetails; 