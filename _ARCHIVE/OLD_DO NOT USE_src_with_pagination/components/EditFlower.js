import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchPlants, updatePlant } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';

function EditFlower() {
  const { plantId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [flowerData, setFlowerData] = useState({
    name: '',
    scientificName: '',
    price: '',
    description: '',
    inventory: {
      inStock: true,
      quantity: 0,
      status: 'active'
    },
    mainImage: '',
    images: []
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadPlant = async () => {
      try {
        console.log('Loading plant with ID:', plantId);
        const plants = await fetchPlants();
        console.log('All plants:', plants);
        console.log('Plant types:', plants.map(p => ({ id: p.id, type: typeof p.images })));
        
        const plant = plants.find(p => String(p.id) === String(plantId));
        console.log('Found plant:', plant);
        console.log('Plant images type:', typeof plant?.images);
        console.log('Plant images value:', plant?.images);

        if (plant) {
          // Ensure images is an array and handle potential object format
          let existingImages = [];
          if (plant.images) {
            console.log('Raw images data:', plant.images);
            if (Array.isArray(plant.images)) {
              console.log('Images is an array');
              existingImages = plant.images;
            } else if (typeof plant.images === 'object') {
              console.log('Images is an object');
              existingImages = Object.values(plant.images);
            }
          }
          console.log('Processed existing images:', existingImages);

          // Convert existing images to the correct format, with error checking
          const formattedImages = [];
          for (const img of existingImages) {
            try {
              const url = typeof img === 'string' ? img : img?.url;
              if (url) {
                formattedImages.push({
                  preview: url,
                  url: url,
                  isNew: false
                });
              }
            } catch (err) {
              console.error('Error processing image:', img, err);
            }
          }
          console.log('Formatted images:', formattedImages);
          
          const initialData = {
            name: plant.name || '',
            scientificName: plant.scientificName || '',
            price: plant.price || '',
            description: plant.description || '',
            inventory: {
              inStock: plant.inventory?.inStock ?? true,
              quantity: plant.inventory?.quantity || 0,
              status: plant.inventory?.status || 'active'
            },
            images: formattedImages,
            mainImage: plant.mainImage || (formattedImages[0]?.url || '')
          };

          console.log('Setting initial data:', initialData);
          setFlowerData(initialData);
        } else {
          console.error('Plant not found with ID:', plantId);
          setError('Plant not found');
        }
      } catch (err) {
        console.error('Error loading plant:', err);
        setError(`Failed to load plant: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadPlant();
  }, [plantId]);

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFileChange = (e) => {
    console.log('File change event triggered');
    console.log('Event target:', e.target);
    console.log('Files:', e.target.files);
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFiles = async (files) => {
    console.log('handleFiles called with:', files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    console.log('Filtered image files:', imageFiles);
    if (imageFiles.length > 0) {
      setIsUploading(true);
      try {
        const newImages = imageFiles.map(file => ({
          file,
          preview: URL.createObjectURL(file),
          isNew: true
        }));

        setFlowerData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages],
          mainImage: prev.mainImage || newImages[0].preview
        }));
      } catch (err) {
        console.error('Error processing images:', err);
        setError('Failed to process images');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveImage = (index) => {
    setFlowerData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      const removedImage = prev.images[index];
      return {
        ...prev,
        images: newImages,
        mainImage: removedImage.preview === prev.mainImage 
          ? (newImages[0]?.preview || '') 
          : prev.mainImage
      };
    });
  };

  const handleSetMainImage = (index) => {
    const image = flowerData.images[index];
    setFlowerData(prev => ({
      ...prev,
      mainImage: image.preview
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    
    try {
      // Upload new images
      const uploadPromises = flowerData.images
        .filter(img => img.isNew)
        .map(async (img) => {
          try {
            const imageRef = ref(storage, `plants/${plantId}/${Date.now()}_${img.file.name}`);
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

      // Update image URLs in the flower data
      const updatedImages = flowerData.images.map(img => 
        img.isNew ? { url: urlMap[img.preview] } : { url: img.url }
      );

      // Update main image URL if it was a new image
      const updatedMainImage = urlMap[flowerData.mainImage] || flowerData.mainImage;

      // Prepare the final data for update
      const updatedData = {
        ...flowerData,
        images: updatedImages.map(img => img.url), // Just send array of URLs
        mainImage: updatedMainImage,
        inventory: {
          ...flowerData.inventory,
          quantity: parseInt(flowerData.inventory.quantity) || 0
        }
      };

      // Remove temporary properties
      delete updatedData.isNew;
      delete updatedData.preview;
      delete updatedData.file;

      await updatePlant(plantId, updatedData);
      navigate('/admin/new-inventory');
    } catch (err) {
      console.error('Error updating plant:', err);
      setError('Failed to update plant: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="edit-flower-container">
      <style>
        {`
          .edit-flower-container {
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
          }

          .form-group input,
          .form-group textarea,
          .form-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }

          .form-group textarea {
            min-height: 100px;
            resize: vertical;
          }

          .upload-controls {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }

          .file-input-wrapper {
            position: relative;
            display: inline-block;
          }

          .upload-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s ease;
            user-select: none;
            pointer-events: none;
          }

          input[type="file"] {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
          }

          .drop-zone {
            border: 2px dashed #ccc;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            background-color: #fafafa;
            transition: all 0.3s ease;
          }

          .drop-zone.dragging {
            border-color: #4CAF50;
            background-color: #f0f9f0;
          }

          .drop-zone.uploading {
            pointer-events: none;
            opacity: 0.7;
          }

          .upload-prompt i {
            font-size: 48px;
            color: #4CAF50;
            margin-bottom: 10px;
          }

          .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }

          .image-item {
            position: relative;
            border: 2px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            aspect-ratio: 1;
          }

          .image-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .image-item.main {
            border-color: #4CAF50;
          }

          .image-actions {
            position: absolute;
            top: 5px;
            right: 5px;
            display: flex;
            gap: 5px;
          }

          .image-actions button {
            background: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
          }

          .image-actions button:hover {
            background: rgba(0, 0, 0, 0.7);
          }

          .save-button {
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 12px 24px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
            margin-top: 20px;
            transition: background-color 0.3s ease;
          }

          .save-button:hover {
            background: #45a049;
          }

          .save-button:disabled {
            background: #cccccc;
            cursor: not-allowed;
          }

          .back-button {
            padding: 8px 16px;
            background: #666;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.3s ease;
          }

          .back-button:hover {
            background: #555;
          }
        `}
      </style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Edit {flowerData.name}</h1>
        <Link to="/admin/new-inventory" className="back-button">Back to Inventory</Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={flowerData.name}
            onChange={(e) => setFlowerData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label>Scientific Name:</label>
          <input
            type="text"
            value={flowerData.scientificName}
            onChange={(e) => setFlowerData(prev => ({ ...prev, scientificName: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label>Price:</label>
          <input
            type="number"
            value={flowerData.price}
            onChange={(e) => setFlowerData(prev => ({ ...prev, price: e.target.value }))}
            required
            min="0"
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={flowerData.description}
            onChange={(e) => setFlowerData(prev => ({ ...prev, description: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label>Status:</label>
          <select
            value={flowerData.inventory.status}
            onChange={(e) => setFlowerData(prev => ({
              ...prev,
              inventory: { ...prev.inventory, status: e.target.value }
            }))}
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <div className="form-group">
          <label>Quantity:</label>
          <input
            type="number"
            value={flowerData.inventory.quantity}
            onChange={(e) => setFlowerData(prev => ({
              ...prev,
              inventory: { ...prev.inventory, quantity: parseInt(e.target.value) }
            }))}
            required
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Images:</label>
          <div className="upload-controls">
            <div style={{ marginBottom: '15px' }}>
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*"
                multiple
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            <div 
              className={`drop-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="upload-prompt">
                <i className="fas fa-cloud-upload-alt"></i>
                <p>Drag and drop images here</p>
                <p style={{ fontSize: '0.8em', color: '#999' }}>You can select multiple images</p>
              </div>
            </div>
          </div>

          {flowerData.images.length > 0 && (
            <div className="image-grid">
              {flowerData.images.map((img, index) => (
                <div key={index} className={`image-item ${img.preview === flowerData.mainImage ? 'main' : ''}`}>
                  <img src={img.preview || img.url} alt={`${flowerData.name} ${index + 1}`} />
                  <div className="image-actions">
                    <button 
                      type="button"
                      onClick={() => handleSetMainImage(index)}
                      title="Set as main image"
                    >
                      {img.preview === flowerData.mainImage ? '★' : '☆'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="save-button"
          disabled={isUploading}
        >
          {isUploading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

export default EditFlower; 