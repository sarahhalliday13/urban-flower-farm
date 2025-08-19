import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { fetchPlants, loadSamplePlants } from '../services/firebase';

function PlantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [newComment, setNewComment] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
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
  const [plant, setPlant] = useState(null);
  const [images, setImages] = useState([]);

  // Add image loading state
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
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

  // Load the plant data
  useEffect(() => {
    const fetchPlantData = async () => {
      setLoading(true);
      try {
        // Fetch all plants and find the one with the matching ID
        const allPlants = await fetchPlants();
        const plant = allPlants.find(p => p.id.toString() === id.toString() || p.id === Number(id));
        
        if (!plant) {
          console.error(`Plant with ID ${id} not found`);
          setError('Plant not found');
          setLoading(false);
          return;
        }
        
        console.log(`Found plant with ID ${id}:`, plant.name);
        
        // Debug logs to investigate image structure
        console.log('Raw plant data images:', plant.images);
        console.log('Image type:', typeof plant.images);
        console.log('Is images array?', Array.isArray(plant.images));
        console.log('Main image:', plant.mainImage);
        console.log('mainImageIndex:', plant.mainImageIndex);
        console.log('Additional images:', plant.additionalImages);
        
        // Comprehensive image handling to account for all possible data structures
        let plantImages = [];
        
        // Handle images based on the data structure
        if (Array.isArray(plant.images) && plant.images.length > 0) {
          // Images is already an array, use it directly
          plantImages = [...plant.images];
          console.log('Using images from array, found', plantImages.length, 'images');
        } else if (typeof plant.images === 'object' && plant.images !== null) {
          // Images is an object (common in Firebase), convert to array
          plantImages = Object.values(plant.images)
            .filter(img => typeof img === 'string' && img.trim() !== '');
          console.log('Extracted images from object, found', plantImages.length, 'images');
        }
        
        // If we found the main image and it's not already in the array, add it first
        if (plant.mainImage && plantImages.indexOf(plant.mainImage) === -1) {
          plantImages.unshift(plant.mainImage);
          console.log('Added main image to the beginning of the array');
        } else if (plant.mainImage && plant.mainImageIndex !== undefined) {
          // If we have a main image and a main image index, make sure it's first in the array
          const mainImageIndex = Number(plant.mainImageIndex);
          if (!isNaN(mainImageIndex) && mainImageIndex >= 0 && mainImageIndex < plantImages.length) {
            // Remove the main image from its current position
            const mainImage = plantImages[mainImageIndex];
            plantImages.splice(mainImageIndex, 1);
            // Add it to the beginning
            plantImages.unshift(mainImage);
            console.log('Moved main image to the beginning based on mainImageIndex');
          }
        }
        
        // As a fallback, check for additionalImages if images array is still empty
        if (plantImages.length === 0 && Array.isArray(plant.additionalImages) && plant.additionalImages.length > 0) {
          plantImages = [...plant.additionalImages];
          console.log('Using additionalImages, found', plantImages.length, 'images');
        }
        
        // If we found the main image and it's in the array multiple times, deduplicate
        if (plant.mainImage) {
          plantImages = plantImages.filter((img, index) => 
            img !== plant.mainImage || index === plantImages.indexOf(plant.mainImage)
          );
        }
        
        // Remove any empty or null entries
        plantImages = plantImages.filter(img => img && typeof img === 'string' && img.trim() !== '');
        
        // Ensure we have at least a placeholder
        if (plantImages.length === 0) {
          plantImages.push('/images/placeholder.jpg');
          console.log('No images found, using placeholder');
        }
        
        console.log(`Final result: Plant ${plant.name} has ${plantImages.length} images:`, plantImages);
        
        setPlant(plant);
        setImages(plantImages);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching plant:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchPlantData();
  }, [id]);

  // Get all plant IDs for navigation
  const plantIds = plants.map(p => p.id);
  const currentIndex = plantIds.indexOf(Number(id) || id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < plantIds.length - 1;

  // Preload images
  useEffect(() => {
    if (!plant) return;
    
    const imageObjects = images.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });
    
    // Mark images as loaded after a short delay
    const timer = setTimeout(() => {
      setImagesLoaded(true);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
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
    }
  };

  const NavigationButtons = ({ className }) => (
    <div className={`plant-navigation ${className}`}>
      <div className="navigation-container" style={{ padding: 0, margin: 0 }}>
        <a 
          href="/shop"
          onClick={(e) => {
            e.preventDefault();
            handleBackToShop();
          }}
          className="back-to-shop-button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 16px',
            backgroundColor: '#f1f7f1',
            color: '#2c5530',
            textDecoration: 'none',
            borderRadius: '4px',
            border: '1px solid #a8c5a9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            fontWeight: '500',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2c5530';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f7f1';
            e.currentTarget.style.color = '#2c5530';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}
        >
          Back to Shop
        </a>
        <div className="nav-group">
          <button
            className="nav-button"
            onClick={() => handleNavigation('prev')}
            disabled={!hasPrevious}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              textDecoration: 'none',
              minWidth: '12px',
              height: '36px',
              boxSizing: 'border-box',
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            ← Previous
          </button>
          <button
            className="nav-button"
            onClick={() => handleNavigation('next')}
            disabled={!hasNext}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              textDecoration: 'none',
              minWidth: '12px',
              height: '36px',
              boxSizing: 'border-box',
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );

  // Back button navigation
  const handleBackToShop = () => {
    // Get the original page number from the URL that led to this detail page
    const referrer = document.referrer;
    let currentPage = '1';
    
    console.log('Raw referrer URL:', referrer);
    
    // Try to extract page from the referrer URL if it came from our shop
    if (referrer && referrer.includes('/shop')) {
      // First try with URLSearchParams for more reliable parsing
      try {
        const referrerUrl = new URL(referrer);
        const pageParam = referrerUrl.searchParams.get('page');
        if (pageParam) {
          currentPage = pageParam;
          console.log('Page extracted with URLSearchParams:', currentPage);
        } else if (referrer.includes('page=')) {
          // Fallback to regex if URLSearchParams doesn't work
          const pageMatch = referrer.match(/page=(\d+)/);
          if (pageMatch && pageMatch[1]) {
            currentPage = pageMatch[1];
            console.log('Page extracted with regex:', currentPage);
          }
        }
      } catch (error) {
        console.error('Error parsing referrer URL:', error);
        // Continue with regex fallback if URL parsing fails
        if (referrer.includes('page=')) {
          const pageMatch = referrer.match(/page=(\d+)/);
          if (pageMatch && pageMatch[1]) {
            currentPage = pageMatch[1];
            console.log('Page extracted with regex after URL parsing failed:', currentPage);
          }
        }
      }
    }
    
    // If we couldn't get the page from referrer, try localStorage
    if (currentPage === '1') {
      const storedPage = localStorage.getItem('shopCurrentPage');
      if (storedPage) {
        currentPage = storedPage;
        console.log('Using page from localStorage:', currentPage);
      }
    }
    
    // Store the current plant ID to allow the shop to scroll to its position
    if (plant && plant.id) {
      localStorage.setItem('lastViewedPlantId', plant.id.toString());
      console.log('Stored current plant ID for scrolling:', plant.id);
    }
    
    console.log(`Navigating back to shop at page ${currentPage}`);
    
    // Use proper HTML navigation to ensure the page parameter is preserved
    const origin = window.location.origin;
    const shopPath = `${origin}/shop?page=${currentPage}`;
    console.log('Navigating to:', shopPath);
    window.location.href = shopPath;
  };

  if (loading) return <div className="loading">Loading plant details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!plant) return <div className="error">Plant not found</div>;

  // eslint-disable-next-line no-unused-vars
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
      // Get the available stock
      const availableStock = parseInt(plant.inventory?.currentStock, 10) || 0;
      
      // Calculate new quantity with bounds
      const newQuantity = Math.max(1, Math.min(prev + delta, availableStock));
      
      // If trying to increase beyond stock, show a message
      if (delta > 0 && prev + delta > availableStock) {
        const event = new CustomEvent('show-toast', {
          detail: {
            message: `Only ${availableStock} in stock`,
            type: 'warning',
            duration: 2000
          }
        });
        window.dispatchEvent(event);
      }
      
      localStorage.setItem(`plant-${id}-quantity`, newQuantity.toString());
      return newQuantity;
    });
  };

  const handleAddToCart = () => {
    if (plant) {
      // Use the quantity parameter instead of a loop
      const added = addToCart(plant, quantity);
      
      // Only show success message if items were actually added
      if (added) {
        // Dispatch the toast event for success
        const event = new CustomEvent('show-toast', {
          detail: {
            message: `${quantity} ${quantity === 1 ? 'item has' : 'items have'} been added to your cart`,
            type: 'success',
            duration: 3000
          }
        });
        window.dispatchEvent(event);
        
        // Reset quantity to 1 after adding to cart
        setQuantity(1);
        localStorage.setItem(`plant-${id}-quantity`, '1');
      }
    }
  };
  
  // Use simple img tag for thumbnail images
  const ThumbnailImage = ({ image, name, index, isActive, onClick }) => {
    return (
      <div 
        className={`thumbnail-image ${isActive ? 'active' : ''}`} 
        onClick={() => onClick(index)}
      >
        <img 
          src={image} 
          alt={`${name} thumbnail ${index + 1}`} 
          height={80} 
          width={80} 
          style={{objectFit: 'cover'}}
          onError={(e) => {
            e.target.src = '/images/placeholder.jpg';
          }}
        />
      </div>
    );
  };

  return (
    <div className="shop-main">
      <NavigationButtons className="top" />
      <div className="plant-details-container">
        <div className="plant-details-gallery">
          <div className="plant-details-image">
            <img 
              src={imagesLoaded ? images[selectedImageIndex] : plant.mainImage || '/images/placeholder.jpg'} 
              alt={plant.name} 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.src = '/images/placeholder.jpg';
              }}
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
                <ThumbnailImage
                  key={index}
                  image={image}
                  name={plant.name}
                  index={index}
                  isActive={selectedImageIndex === index}
                  onClick={(newIndex) => {
                    setSelectedImageIndex(newIndex);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="plant-details-info">
          <div className="plant-info" style={{ padding: 0, margin: 0, paddingLeft: 0, paddingRight: 0 }}>
            <div className="name-and-status">
              <h1 className="plant-common-name">{plant.name}</h1>
              {(() => {
                // Get the current stock
                const currentStock = plant.inventory?.currentStock || 0;
                
                // Common inline styles for all status badges
                const statusBadgeStyle = {
                  paddingBottom: 0,
                  marginBottom: 0,
                  alignSelf: 'flex-start',
                  position: 'relative',
                  top: '0.4rem'
                };
                
                if (currentStock <= 0) {
                  // Standardize on "Out of Stock" terminology
                  return (
                    <span className="status-badge sold-out" style={statusBadgeStyle}>
                      Out of Stock
                    </span>
                  );
                } else if (currentStock < 10) {
                  // Show as "In Stock" instead of "Low Stock"
                  return (
                    <span className="status-badge in-stock" style={statusBadgeStyle}>
                      In Stock
                    </span>
                  );
                } else if (plant.inventory?.status) {
                  // For other statuses like 'Coming Soon' or custom ones
                  // If it happens to be "Sold Out", standardize to "Out of Stock"
                  if (plant.inventory.status.toLowerCase() === 'sold out') {
                    return (
                      <span className="status-badge sold-out" style={statusBadgeStyle}>
                        Out of Stock
                      </span>
                    );
                  }
                  return (
                    <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(' ', '-') || 'in-stock'}`} style={statusBadgeStyle}>
                      {plant.inventory.status}
                    </span>
                  );
                } else {
                  return (
                    <span className="status-badge in-stock" style={statusBadgeStyle}>
                      In Stock
                    </span>
                  );
                }
              })()}
            </div>
            {(plant.scientificName || plant.latinname) && (
              <h2 className="scientific-name">{plant.scientificName || plant.latinname}</h2>
            )}
          </div>
          
          <p className="description">{plant.description}</p>
          
          <div className="price-action-container">
            <p className="price">${plant.price}</p>
            <div className="price-controls">
              <div className="quantity-selector">
                <button 
                  className="quantity-button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1 || plant.inventory?.currentStock <= 0}
                >-</button>
                <span className="quantity">{quantity}</span>
                <button 
                  className="quantity-button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= (plant.inventory?.currentStock || 0)}
                  title={quantity >= (plant.inventory?.currentStock || 0) ? "Maximum stock reached" : ""}
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
          
          <div className="plant-specs">
            <h3>Plant Specifications</h3>
            {plant.plantType && (
              <p>
                <strong>Type:</strong>&nbsp;&nbsp;
                <span className={`type-badge ${plant.plantType?.toLowerCase().replace(/\s+/g, '-') || 'other'}`}>
                  {plant.plantType}
                </span>
              </p>
            )}
            {plant.height_inches && <p><strong>Height:</strong> {plant.height_inches}"</p>}
            {(plant.height && !plant.height_inches) && <p><strong>Height:</strong> {plant.height.toString().includes('"') ? plant.height : `${plant.height}"`}</p>}
            {plant.spread_inches && <p><strong>Spread:</strong> {plant.spread_inches}"</p>}
            {plant.spacing && <p><strong>Spacing:</strong> {plant.spacing.toString().includes('"') ? plant.spacing : `${plant.spacing}"`}</p>}
            {plant.sunlight && <p><strong>Sunlight:</strong> {plant.sunlight}</p>}
            {(plant.light && !plant.sunlight) && <p><strong>Light:</strong> {plant.light}</p>}
            {plant.hardiness_zones && <p><strong>Hardiness Zone:</strong> {plant.hardiness_zones}</p>}
            {(plant.hardinessZone && !plant.hardiness_zones) && <p><strong>Hardiness Zone:</strong> {plant.hardinessZone}</p>}
            {plant.bloomSeason && <p><strong>Bloom Season:</strong> {plant.bloomSeason}</p>}
            {plant.bloom_season && <p><strong>Bloom Season:</strong> {plant.bloom_season}</p>}
            {plant.plantingSeason && <p><strong>Planting Season:</strong> {plant.plantingSeason}</p>}
            {plant.planting_season && <p><strong>Planting Season:</strong> {plant.planting_season}</p>}
            {plant.plantingDepth && <p><strong>Planting Depth:</strong> {plant.plantingDepth} inches</p>}
            {plant.planting_depth_inches && <p><strong>Planting Depth:</strong> {plant.planting_depth_inches} inches</p>}
            {plant.planting_depth && <p><strong>Planting Depth:</strong> {plant.planting_depth} inches</p>}
            {plant.size && <p><strong>Mature Size:</strong> {plant.size}</p>}
            {plant.mature_size && <p><strong>Mature Size:</strong> {plant.mature_size}</p>}
            {plant.colour && <p><strong>Colour:</strong> {plant.colour}</p>}
            {plant.featured && <p><strong>Featured:</strong> Yes</p>}
            {plant.special_features && <p><strong>Special Features:</strong> {plant.special_features}</p>}
            {(plant.specialFeatures && !plant.special_features) && <p><strong>Special Features:</strong> {plant.specialFeatures}</p>}
            {plant.uses && <p><strong>Uses:</strong> {plant.uses}</p>}
            {plant.aroma && <p><strong>Aroma:</strong> {plant.aroma}</p>}
            {plant.gardeningTips && <p><strong>Gardening Tips:</strong> {plant.gardeningTips}</p>}
            {plant.gardening_tips && <p><strong>Gardening Tips:</strong> {plant.gardening_tips}</p>}
            {plant.careTips && <p><strong>Care Tips:</strong> {plant.careTips}</p>}
            {plant.care_tips && <p><strong>Care Tips:</strong> {plant.care_tips}</p>}
          </div>
        </div>
      </div>
      <NavigationButtons className="bottom" />
    </div>
  );
}

export default PlantDetails; 