import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchPlants, updatePlant, addPlant } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';

// Import subcomponents
import BasicInfoForm from './sections/BasicInfoForm';
import InventoryForm from './sections/InventoryForm';
import ImageUploaderWithAttribution from './sections/ImageUploaderWithAttribution';
import VisibilityToggles from './sections/VisibilityToggles';
import PlantDetailsForm from './sections/PlantDetailsForm';

// Import styles
import './PlantEditor.css';

const ModularPlantEditor = () => {
  const { plantId } = useParams();
  const navigate = useNavigate();
  const isAddMode = !plantId;
  
  console.log("ModularPlantEditor - plantId:", plantId);
  console.log("ModularPlantEditor - isAddMode:", isAddMode);
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [flowerData, setFlowerData] = useState({
    name: '',
    scientificName: '',
    price: '',
    description: '',
    inventory: {
      currentStock: 0,
      status: 'In Stock',
      restockDate: '',
      notes: ''
    },
    images: [],
    mainImage: '',
    imageMetadata: {},
    featured: false,
    hidden: false
  });
  
  // Image handling state
  const [images, setImages] = useState([]);
  const [mainImage, setMainImage] = useState('');
  const [imageMetadata, setImageMetadata] = useState({});

  // Load plant data if in edit mode
  useEffect(() => {
    console.log("Loading plant data, plantId:", plantId, "isAddMode:", isAddMode);
    
    if (isAddMode) {
      setLoading(false);
      return;
    }
    
    const loadPlant = async () => {
      try {
        setError(null);
        const plants = await fetchPlants();
        console.log("Fetched plants:", plants);
        
        const plant = plants.find(p => String(p.id) === String(plantId));
        console.log("Found plant:", plant);
        
        if (!plant) {
          console.error("Plant not found with ID:", plantId);
          setError('Plant not found');
          setLoading(false);
          return;
        }
        
        // Process existing images
        let processedImages = [];
        if (plant.images) {
          try {
            const imageArray = Array.isArray(plant.images) 
              ? plant.images 
              : typeof plant.images === 'object' ? Object.values(plant.images) : [];
              
            processedImages = imageArray.map(img => {
              const url = typeof img === 'string' ? img : img?.url;
              return url ? { url, preview: url, isNew: false } : null;
            }).filter(Boolean);
          } catch (err) {
            console.error('Error processing images:', err);
          }
        }
        
        // Set images state
        setImages(processedImages);
        setMainImage(plant.mainImage || (processedImages[0]?.url || ''));
        
        // Set form data
        setFlowerData({
          name: plant.name || '',
          scientificName: plant.scientificName || '',
          price: plant.price || '',
          description: plant.description || '',
          inventory: {
            currentStock: plant.inventory?.currentStock || 0,
            status: plant.inventory?.status || 'In Stock',
            restockDate: plant.inventory?.restockDate || '',
            notes: plant.inventory?.notes || ''
          },
          // Add all other fields
          colour: plant.colour || '',
          light: plant.light || '',
          height: plant.height || '',
          spread: plant.spread || '',
          bloomSeason: plant.bloomSeason || '',
          plantType: plant.plantType || '',
          specialFeatures: plant.specialFeatures || '',
          uses: plant.uses || '',
          aroma: plant.aroma || '',
          careTips: plant.careTips || '',
          gardeningTips: plant.gardeningTips || '',
          hardinessZone: plant.hardinessZone || '',
          plantingSeason: plant.plantingSeason || '',
          plantingDepth: plant.plantingDepth || '',
          size: plant.size || '',
          featured: plant.featured === true || plant.featured === 'true',
          hidden: plant.hidden === true || plant.hidden === 'true',
          imageMetadata: plant.imageMetadata || {}
        });
        
        // Set image metadata separately
        setImageMetadata(plant.imageMetadata || {});
      } catch (err) {
        console.error('Error loading plant:', err);
        setError(`Failed to load plant: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadPlant();
  }, [plantId, isAddMode]);

  // Validate form data
  const validateForm = () => {
    const errors = {};
    
    if (!flowerData.name.trim()) {
      errors.name = 'Plant name is required';
    }
    
    if (!flowerData.price) {
      errors.price = 'Price is required';
    } else if (isNaN(parseFloat(flowerData.price))) {
      errors.price = 'Price must be a number';
    }
    
    if (images.length === 0) {
      errors.images = 'At least one image is required';
    }
    
    if (!mainImage) {
      errors.mainImage = 'A main image must be selected';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      // Show error toast
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: 'Please correct errors in the form',
          type: 'error',
          duration: 5000
        }
      }));
      
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Upload new images
      const uploadPromises = images
        .filter(img => img.isNew)
        .map(async (img) => {
          try {
            const fileName = `${Date.now()}_${img.file.name}`;
            const storagePath = isAddMode ? 
              `plants/new/${fileName}` : 
              `plants/${plantId}/${fileName}`;
              
            const imageRef = ref(storage, storagePath);
            await uploadBytes(imageRef, img.file);
            const downloadUrl = await getDownloadURL(imageRef);
            
            return {
              originalPreview: img.preview,
              downloadUrl
            };
          } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
          }
        });

      const uploadedImages = await Promise.all(uploadPromises);
      
      // Create a map of preview URLs to download URLs
      const urlMap = Object.fromEntries(
        uploadedImages.map(({ originalPreview, downloadUrl }) => [originalPreview, downloadUrl])
      );

      // Update image URLs in the data
      const finalImageUrls = images.map(img => {
        if (img.isNew) {
          return urlMap[img.preview] || '';
        }
        return img.url || '';
      }).filter(Boolean);

      // Update main image URL if it was a new image
      const finalMainImageUrl = mainImage && urlMap[mainImage] ? urlMap[mainImage] : mainImage;

      // Prepare final data for database
      const finalData = {
        ...flowerData,
        images: finalImageUrls,
        mainImage: finalMainImageUrl,
        imageMetadata: imageMetadata,
        price: parseFloat(flowerData.price),
        inventory: {
          ...flowerData.inventory,
          currentStock: parseInt(flowerData.inventory.currentStock) || 0
        }
      };

      // Save to database
      if (isAddMode) {
        // Generate a new ID or let Firebase do it
        const newId = Date.now().toString();
        await addPlant({
          ...finalData,
          id: newId
        });
        
        // Show success toast
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            message: 'Plant added successfully!',
            type: 'success',
            duration: 3000
          }
        }));
      } else {
        await updatePlant(plantId, finalData);
        
        // Show success toast
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            message: 'Plant updated successfully!',
            type: 'success',
            duration: 3000
          }
        }));
      }

      // Navigate back to inventory
      navigate('/admin/inventory');
    } catch (err) {
      console.error('Error saving plant:', err);
      setError(`Failed to save plant: ${err.message}`);
      
      // Show error toast
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: `Error: ${err.message}`,
          type: 'error',
          duration: 5000
        }
      }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading plant data...</p>
      </div>
    );
  }

  console.log('About to render ModularPlantEditor');
  return (
    <div className="plant-editor-container">
      <div className="plant-editor-header" style={{position: 'fixed', top: 0, left: 0, right: 0, background: 'blue', zIndex: 99999, padding: '15px 20px', color: 'white'}}>
        <h1 style={{margin: 0, color: 'white'}}>{isAddMode ? 'Add New Plant' : `Edit ${flowerData.name}`}</h1>
        <div style={{display: 'flex', gap: '10px'}}>
          <Link to="/admin/inventory" style={{color: 'white', textDecoration: 'none', padding: '8px 16px', border: '1px solid white', borderRadius: '4px'}}>Back to Inventory</Link>
          <button type="submit" form="plant-editor-form" style={{color: 'white', background: 'green', border: 'none', padding: '8px 16px', borderRadius: '4px'}}>Save</button>
        </div>
      </div>
      <div style={{height: '80px'}}></div>

      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={() => navigate(0)} // refresh the page
          >
            Retry
          </button>
        </div>
      )}

      <form id="plant-editor-form" onSubmit={handleSubmit} className="plant-editor-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h2>Basic Information</h2>
          <BasicInfoForm 
            flowerData={flowerData} 
            setFlowerData={setFlowerData} 
            errors={formErrors}
          />
        </div>

        {/* Image Upload Section */}
        <div className="form-section">
          <h2>Images</h2>
          <ImageUploaderWithAttribution 
            images={images.map(img => img.url || img.preview || img)}
            imageMetadata={imageMetadata}
            inventory={flowerData.inventory || {}}
            mainImageIndex={images.findIndex(img => (img.url || img.preview || img) === mainImage)}
            plantId={plantId}
            onUpload={(newImages) => {
              // Convert array of URLs to image objects
              const imageObjects = newImages.map((url, index) => {
                const existingImage = images[index];
                if (existingImage && !existingImage.isNew) {
                  return existingImage;
                }
                return { url, preview: url, isNew: false };
              });
              setImages(imageObjects);
            }}
            onMetadataUpdate={(newMetadata) => {
              setImageMetadata(newMetadata);
            }}
            onMainSelect={(index) => {
              const selectedImage = images[index];
              setMainImage(selectedImage?.url || selectedImage?.preview || selectedImage);
            }}
            onRemoveImage={(index) => {
              const imageUrl = images[index]?.url || images[index]?.preview || images[index];
              const newImages = images.filter((_, i) => i !== index);
              setImages(newImages);
              
              // Remove metadata for deleted image
              const newMetadata = { ...imageMetadata };
              delete newMetadata[imageUrl];
              setImageMetadata(newMetadata);
              
              // Update main image if removed
              if (index === images.findIndex(img => (img.url || img.preview || img) === mainImage)) {
                setMainImage(newImages[0]?.url || newImages[0]?.preview || newImages[0] || '');
              }
            }}
            onInventoryUpdate={(updatedInventory) => {
              setFlowerData(prev => ({
                ...prev,
                inventory: { ...prev.inventory, ...updatedInventory }
              }));
            }}
          />
          {formErrors.images && <div className="invalid-feedback">{formErrors.images}</div>}
          {formErrors.mainImage && <div className="invalid-feedback">{formErrors.mainImage}</div>}
        </div>

        {/* Inventory Information */}
        <div className="form-section">
          <h2>Inventory Information</h2>
          <InventoryForm 
            flowerData={flowerData} 
            setFlowerData={setFlowerData}
          />
        </div>

        {/* Visibility Settings */}
        <div className="form-section">
          <h2>Visibility</h2>
          <VisibilityToggles 
            flowerData={flowerData} 
            setFlowerData={setFlowerData}
          />
        </div>

        {/* Additional Plant Details */}
        <div className="form-section">
          <h2>Additional Details</h2>
          <PlantDetailsForm 
            flowerData={flowerData} 
            setFlowerData={setFlowerData}
          />
        </div>

        {/* Spacer for sticky footer */}
        <div className="form-spacer"></div>
      </form>
      
    </div>
  );
};

export default ModularPlantEditor; 