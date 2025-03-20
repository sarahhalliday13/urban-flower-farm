import React, { useState, useEffect, Component } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { fetchPlants, loadSamplePlants } from '../services/firebase';
import ImageWithFallback from './ImageWithFallback';

// Add an error boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PlantDetails error caught:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <details>
            <summary>Error Details</summary>
            <p>{this.state.error && this.state.error.toString()}</p>
            <p>Component Stack: {this.state.errorInfo && this.state.errorInfo.componentStack}</p>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        
        // Special handling for plants with known issues
        if (plant.name === "Palmer's Beardtongue" || plant.name === "Gaillardia Pulchella Mix") {
          console.log(`FOUND PLANT WITH SPECIAL HANDLING: ${plant.name}`, plant);
          
          // Ensure additionalImages exists and is valid
          if (!plant.additionalImages || !Array.isArray(plant.additionalImages) || plant.additionalImages.length === 0) {
            console.log(`Fixing additionalImages for ${plant.name}`);
            
            if (plant.name === "Palmer's Beardtongue") {
              plant.additionalImages = [
                "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri2.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
                "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri3.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
                "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri4.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
                "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri5.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739"
              ];
            } else if (plant.name === "Gaillardia Pulchella Mix") {
              plant.additionalImages = [
                "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella2.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
                "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella3.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
                "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella4.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
                "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella5.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739"
              ];
            }
            
            console.log(`After fixing, additionalImages:`, plant.additionalImages);
          }
        }
        
        // Process images - combine main image and additional images
        const mainImage = plant.mainImage || '/images/placeholder.jpg';
        const additionalImages = plant.additionalImages || [];
        const allImages = [mainImage, ...additionalImages].filter(img => img); // Filter out any undefined/null
        
        // Debug for specific plants
        if (plant.name === "Palmer's Beardtongue" || plant.name === "Gaillardia Pulchella Mix") {
          console.log('PLANT DETAILS IMAGES:', {
            name: plant.name,
            mainImage: mainImage,
            additionalImages: additionalImages,
            allImages: allImages
          });
        }
        
        setPlant(plant);
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

  // Handle different image field names from spreadsheet and filter out any empty/null images
  // Create a complete array of valid images
  // 
  // IMPORTANT: This app MUST use Firebase Storage URLs for images, not local paths.
  // Images should use Firebase Storage URLs with format:
  // https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2F[filename].jpg?alt=media&token=[token]
  const getValidImages = () => {
    if (!plant) return ['/images/placeholder.jpg'];
    
    // For known plants, use Firebase Storage URLs with tokens
    if (plant.name === "Palmer's Beardtongue") {
      return [
        "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
        "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri2.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
        "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri3.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
        "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri4.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739"
      ];
    } else if (plant.name === "Gaillardia Pulchella Mix") {
      return [
        "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
        "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella2.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
        "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella3.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
        "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella4.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739"
      ];
    }
    
    // For other plants, start with main image
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
    return allImages.length > 0 ? allImages : ['/images/placeholder.jpg'];
  };
  
  const imagesFromDb = getValidImages();

  const handleNavigation = (direction) => {
    setSelectedImageIndex(0);
    
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < plantIds.length) {
      navigate(`/plant/${plantIds[newIndex]}`);
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

  // Log the images for debugging
  console.log('Plant images:', imagesFromDb);
  
  // Simplified thumbnail component
  const ThumbnailImage = ({ image, name, index, isActive, onClick }) => (
    <div 
      className={`thumbnail ${isActive ? 'active' : ''}`} 
      onClick={() => onClick(index)}
    >
      <ImageWithFallback 
        src={image}
        alt={`${name} - view ${index + 1}`}
        height={60}
        width={60}
        lazyLoad={false}
      />
    </div>
  );

  return (
    <ErrorBoundary>
      <main>
        <NavigationButtons className="top" />
        <div className="plant-details">
          <div className="plant-details-container">
            <div className="plant-details-gallery">
              <div className="plant-details-image">
                <ImageWithFallback 
                  src={imagesFromDb[selectedImageIndex]}
                  alt={plant.name}
                  height={400}
                  className="main-image"
                  lazyLoad={false}
                />
              </div>
              {imagesFromDb.length > 1 && (
                <div className="image-thumbnails">
                  {imagesFromDb.map((image, index) => (
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
                <h1 className="plant-common-name">{plant.name}</h1>
                {plant.scientificName && (
                  <h2 className="scientific-name">{plant.scientificName}</h2>
                )}
                <div className="plant-meta">
                  {plant.commonName && plant.scientificName && (
                    <p className="plant-names">
                      {plant.commonName} <span className="latin-name">({plant.scientificName})</span>
                    </p>
                  )}
                </div>
              </div>
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
              
              {/* Inventory Status Information */}
              <div className="inventory-status">
                {plant.inventory?.currentStock > 0 && (
                  <div className="inventory-status-row">
                    <span className={`status-badge ${plant.inventory?.status?.toLowerCase().replace(' ', '-') || 'unknown'}`}>
                      {plant.inventory?.status || 'Unknown'}
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
      </main>
    </ErrorBoundary>
  );
}

export default PlantDetails; 