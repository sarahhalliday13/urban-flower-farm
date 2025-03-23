import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
        
        // Simplify image handling - just use the mainImage with a fallback
        const plantImages = [];
        
        // Add the main image if available
        if (plant.mainImage) {
          plantImages.push(plant.mainImage);
        }
        
        // Try to add additional images (only if they exist)
        if (Array.isArray(plant.images) && plant.images.length > 0) {
          // Skip the first image if it's the same as mainImage
          const additionalImages = plant.images.filter(img => img !== plant.mainImage);
          plantImages.push(...additionalImages);
        } else if (Array.isArray(plant.additionalImages)) {
          plantImages.push(...plant.additionalImages);
        }
        
        // Ensure we have at least a placeholder
        if (plantImages.length === 0) {
          plantImages.push('/images/placeholder.jpg');
        }
        
        console.log(`Plant ${plant.name} has ${plantImages.length} images`);
        
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
      window.scrollTo(0, 0);
    }
  };

  const NavigationButtons = ({ className }) => (
    <div className={`plant-navigation ${className}`}>
      <div className="navigation-container">
        <div className="nav-view-all">
          <a href="/shop" className="view-all-link">Back to Shop</a>
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
    <main>
      <div className="shop-main">
        <NavigationButtons className="top" />
        <div className="plant-details">
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
              <div className="plant-info">
                <div className="name-and-status">
                  <h1 className="plant-common-name">{plant.name}</h1>
                  {(() => {
                    // Get the current stock
                    const currentStock = plant.inventory?.currentStock || 0;
                    
                    if (currentStock <= 0) {
                      return (
                        <span className="status-badge sold-out">
                          Out of Stock
                        </span>
                      );
                    } else if (currentStock < 10) {
                      return (
                        <span className="status-badge low-stock">
                          Low Stock ({currentStock} left)
                        </span>
                      );
                    } else if (plant.inventory?.status) {
                      return (
                        <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(' ', '-') || 'in-stock'}`}>
                          {plant.inventory.status}
                        </span>
                      );
                    } else {
                      return (
                        <span className="status-badge in-stock">
                          In Stock
                        </span>
                      );
                    }
                  })()}
                </div>
                {(plant.scientificName || plant.latinname) && (
                  <h2 className="scientific-name">{plant.scientificName || plant.latinname}</h2>
                )}
                <div className="plant-meta">
                  {(plant.commonName || plant.commonname) && (plant.scientificName || plant.latinname) && (
                    <p className="plant-names">
                      {plant.commonName || plant.commonname} <span className="latin-name">({plant.scientificName || plant.latinname})</span>
                    </p>
                  )}
                </div>
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
        </div>
        <NavigationButtons className="bottom" />
      </div>
    </main>
  );
}

export default PlantDetails; 