import React, { useState, useRef, useEffect } from 'react';
import { uploadImageToFirebase } from '../../../services/firebase';
import '../../../styles/ImageUploader.css';

// Common commercial sources for dropdown
const COMMERCIAL_SOURCES = [
  { value: 'annies', name: "Annie's Annuals & Perennials" },
  { value: 'van-noort', name: 'Van Noort Bulb' },
  { value: 'jelitto', name: 'Jelitto' },
  { value: 'genesis', name: 'Genesis Seed' },
  { value: 'park-seed', name: 'Park Seed' },
  { value: 'burpee', name: 'Burpee' },
  { value: 'johnnys', name: "Johnny's Selected Seeds" },
  { value: 'eden-brothers', name: 'Eden Brothers' },
  { value: 'american-meadows', name: 'American Meadows' },
  { value: 'other', name: 'Other (specify)' }
];

const ImageUploaderWithAttribution = ({ 
  images = [], 
  imageMetadata = {},
  inventory = {},
  mainImageIndex = 0, 
  onUpload, 
  onMainSelect, 
  onRemoveImage,
  onMetadataUpdate,
  onInventoryUpdate,
  plantId = null
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(true);
  const fileInputRef = useRef(null);
  
  // Attribution state for new uploads
  const [imageSource, setImageSource] = useState('own'); // 'own' or 'commercial'
  const [commercialSource, setCommercialSource] = useState('');
  const [customSourceName, setCustomSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [photographerName, setPhotographerName] = useState('');
  const [addWatermark, setAddWatermark] = useState(false);
  
  // Edit mode for existing images
  const [editingIndex, setEditingIndex] = useState(null);
  const [editMetadata, setEditMetadata] = useState({});

  // Create metadata object for new image
  const createImageMetadata = (url) => {
    const metadata = {
      url,
      type: imageSource,
      uploadedAt: new Date().toISOString()
    };

    if (imageSource === 'commercial') {
      const selectedSource = COMMERCIAL_SOURCES.find(s => s.value === commercialSource);
      metadata.source = {
        name: commercialSource === 'other' ? customSourceName : selectedSource?.name || '',
        url: sourceUrl || ''
      };
    } else {
      metadata.photographer = photographerName || '';
      metadata.watermarked = addWatermark;
    }

    return metadata;
  };
  
  // Create a safe key from URL for Firebase (replace dots and slashes)
  const createSafeKey = (url) => {
    return url.replace(/[.#$\[\]/]/g, '_');
  };

  // Handle file selection
  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setError(null);
    const fileArray = Array.from(files);
    
    try {
      // Validate files
      const validFiles = fileArray.filter(file => {
        // Check file type
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} is not a valid image file`);
          return false;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name} exceeds the maximum file size of 5MB`);
          return false;
        }
        
        return true;
      });
      
      if (validFiles.length === 0) {
        setUploading(false);
        return;
      }
      
      // Upload each valid file
      const uploadPromises = validFiles.map(async (file, index) => {
        try {
          // Update progress
          setUploadProgress(((index) / validFiles.length) * 100);
          
          // Create a unique filename with timestamp
          const timestamp = Date.now();
          const fileExtension = file.name.split('.').pop();
          const fileName = `${timestamp}_${index}.${fileExtension}`;
          
          // Use plant ID in path if available
          const storagePath = plantId 
            ? `plants/${plantId}/${fileName}`
            : `plants/${fileName}`;
          
          // Add metadata to Firebase upload
          const customMetadata = {
            source: imageSource,
            ...(imageSource === 'commercial' && {
              sourceName: commercialSource === 'other' ? customSourceName : COMMERCIAL_SOURCES.find(s => s.value === commercialSource)?.name,
              sourceUrl: sourceUrl
            }),
            ...(imageSource === 'own' && {
              photographer: photographerName,
              watermarked: addWatermark.toString()
            })
          };
          
          // Upload to Firebase with path and metadata
          const imageUrl = await uploadImageToFirebase(file, storagePath, customMetadata);
          return imageUrl;
        } catch (err) {
          console.error(`Error uploading ${file.name}:`, err);
          setError(`Failed to upload ${file.name}: ${err.message}`);
          return null;
        }
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null);
      
      if (validUrls.length > 0) {
        // Create metadata for each uploaded image
        const newMetadata = { ...imageMetadata };
        validUrls.forEach(url => {
          const safeKey = createSafeKey(url);
          newMetadata[safeKey] = createImageMetadata(url);
        });
        
        // Add new images to existing ones
        const newImages = [...images, ...validUrls];
        onUpload(newImages);
        onMetadataUpdate(newMetadata);
        
        // Save photo credits to inventory for each uploaded image
        if (onInventoryUpdate && validUrls.length > 0) {
          const inventoryUpdates = {};
          validUrls.forEach((url, urlIndex) => {
            const imageIndex = images.length + urlIndex;
            const fieldPrefix = imageIndex === 0 ? 'main' : `add${imageIndex}`;
            
            inventoryUpdates[`${fieldPrefix}CreditType`] = imageSource;
            if (imageSource === 'commercial') {
              const selectedSource = COMMERCIAL_SOURCES.find(s => s.value === commercialSource);
              inventoryUpdates[`${fieldPrefix}CreditSource`] = commercialSource === 'other' ? customSourceName : selectedSource?.name || '';
              inventoryUpdates[`${fieldPrefix}CreditUrl`] = sourceUrl || '';
            } else if (imageSource === 'own') {
              inventoryUpdates[`${fieldPrefix}CreditSource`] = photographerName || (addWatermark ? 'Buttons Flower Farm' : '');
            }
          });
          
          const updatedInventory = { ...inventory, ...inventoryUpdates };
          onInventoryUpdate(updatedInventory);
        }
        
        // Reset attribution fields
        setImageSource('own');
        setCommercialSource('');
        setCustomSourceName('');
        setSourceUrl('');
        setPhotographerName('');
        setAddWatermark(false);
      }
    } catch (err) {
      console.error('Error in file upload:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  // Validate Firebase Storage URL
  const isValidFirebaseUrl = (url) => {
    const firebaseStoragePattern = /^https:\/\/firebasestorage\.googleapis\.com\/.+/;
    const firebaseAppPattern = /^https:\/\/storage\.googleapis\.com\/.+/;
    return firebaseStoragePattern.test(url) || firebaseAppPattern.test(url);
  };

  // Handle URL submission
  const handleUrlSubmit = (e) => {
    e.preventDefault();
    
    if (!urlInput.trim()) {
      setError('Please enter a URL');
      return;
    }
    
    // Validate URL format
    try {
      new URL(urlInput);
    } catch (err) {
      setError('Please enter a valid URL');
      return;
    }
    
    // Check if it's a Firebase Storage URL
    if (!isValidFirebaseUrl(urlInput)) {
      setError('Please enter a valid Firebase Storage URL');
      return;
    }
    
    // Create metadata for the URL
    const url = urlInput.trim();
    const metadata = createImageMetadata(url);
    const safeKey = createSafeKey(url);
    const newMetadata = { ...imageMetadata, [safeKey]: metadata };
    
    // Add the URL to images
    const newImages = [...images, url];
    onUpload(newImages);
    onMetadataUpdate(newMetadata);
    
    // Reset form
    setUrlInput('');
    setError(null);
    setImageSource('own');
    setCommercialSource('');
    setCustomSourceName('');
    setSourceUrl('');
    setPhotographerName('');
    setAddWatermark(false);
  };

  // Start editing metadata for an image
  const startEditingMetadata = (index) => {
    const imageUrl = images[index];
    const safeKey = createSafeKey(imageUrl);
    const metadata = imageMetadata[safeKey] || imageMetadata[imageUrl] || {}; // Check both
    setEditingIndex(index);
    
    // Find matching commercial source value
    let commercialSourceValue = '';
    if (metadata.type === 'commercial' && metadata.source?.name) {
      // Try exact match first
      let matchingSource = COMMERCIAL_SOURCES.find(s => s.name === metadata.source.name);
      
      // If no exact match, try partial match for Annie's (handle old data)
      if (!matchingSource && metadata.source.name.includes("Annie")) {
        matchingSource = COMMERCIAL_SOURCES.find(s => s.value === 'annies');
      }
      
      commercialSourceValue = matchingSource ? matchingSource.value : 'other';
    }
    
    setEditMetadata({
      type: metadata.type || 'own',
      source: metadata.source || {},
      commercialSource: commercialSourceValue,
      customSourceName: commercialSourceValue === 'other' ? metadata.source?.name || '' : '',
      sourceUrl: metadata.source?.url || '',
      photographer: metadata.photographer || '',
      watermarked: metadata.watermarked || false
    });
  };

  // Save edited metadata
  const saveEditedMetadata = () => {
    const imageUrl = images[editingIndex];
    const safeKey = createSafeKey(imageUrl);
    const newMetadata = { ...imageMetadata };
    
    // Build the metadata object similar to createImageMetadata
    const updatedMetadata = {
      url: imageUrl,
      type: editMetadata.type,
      uploadedAt: newMetadata[safeKey]?.uploadedAt || new Date().toISOString()
    };
    
    if (editMetadata.type === 'commercial') {
      const selectedSource = COMMERCIAL_SOURCES.find(s => s.value === editMetadata.commercialSource);
      updatedMetadata.source = {
        name: editMetadata.commercialSource === 'other' ? editMetadata.customSourceName : selectedSource?.name || '',
        url: editMetadata.sourceUrl || ''
      };
    } else {
      updatedMetadata.photographer = editMetadata.photographer || '';
      updatedMetadata.watermarked = editMetadata.watermarked;
    }
    
    newMetadata[safeKey] = updatedMetadata;
    onMetadataUpdate(newMetadata);
    setEditingIndex(null);
    setEditMetadata({});
  };

  // Get display text for attribution
  const getAttributionText = (imageUrl) => {
    const safeKey = createSafeKey(imageUrl);
    const metadata = imageMetadata[safeKey] || imageMetadata[imageUrl]; // Check both for backwards compat
    if (!metadata) return null;
    
    if (metadata.type === 'commercial' && metadata.source) {
      return `Source: ${metadata.source.name}`;
    } else if (metadata.type === 'own') {
      if (metadata.photographer) {
        return `Photo by ${metadata.photographer}`;
      }
      return metadata.watermarked ? 'Photo credit: Button\'s Flower Farm' : null;
    }
    return null;
  };

  return (
    <div className="image-uploader">
      <div className="plant-images-section">
        <h3>Plant Images</h3>
        
        {/* Existing Images - Horizontal Layout */}
        {images.length > 0 && (
          <div className="images-horizontal-grid">
            {images.map((imageUrl, index) => {
              const fieldPrefix = index === 0 ? 'main' : `add${index}`;
              const creditType = inventory[`${fieldPrefix}CreditType`] || 'own';
              const creditSource = inventory[`${fieldPrefix}CreditSource`] || '';
              
              return (
                <div key={`${index}-${creditType}`} className="image-credit-pair">
                  <div className={`image-container ${mainImageIndex === index ? 'main-image' : ''}`}>
                    <img src={imageUrl} alt={`Plant ${index + 1}`} />
                    
                    <div className="image-overlay-actions">
                      <button
                        type="button"
                        className="overlay-btn star-btn"
                        onClick={() => onMainSelect(index)}
                        title={mainImageIndex === index ? "Main Image" : "Set as Main"}
                      >
                        {mainImageIndex === index ? "★" : "☆"}
                      </button>
                      <button
                        type="button"
                        className="overlay-btn remove-btn"
                        onClick={() => onRemoveImage(index)}
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  <div className="photo-credit-controls">
                    <h4>Photo Credit</h4>
                    
                    <div className="credit-tabs">
                      <button
                        type="button"
                        className={`credit-tab ${creditType === 'own' ? 'active' : ''}`}
                        onClick={() => {
                          if (onInventoryUpdate) {
                            const updates = { [`${fieldPrefix}CreditType`]: 'own' };
                            const updatedInventory = { ...inventory, ...updates };
                            onInventoryUpdate(updatedInventory);
                          }
                        }}
                      >
                        My Own Photo
                      </button>
                      <button
                        type="button"
                        className={`credit-tab ${creditType === 'commercial' ? 'active' : ''}`}
                        onClick={() => {
                          if (onInventoryUpdate) {
                            const updates = { [`${fieldPrefix}CreditType`]: 'commercial' };
                            const updatedInventory = { ...inventory, ...updates };
                            onInventoryUpdate(updatedInventory);
                          }
                        }}
                      >
                        Commercial Source
                      </button>
                    </div>
                    
                    <div className="credit-content">
                      {creditType === 'own' && (
                        <>
                          <label className="watermark-checkbox">
                            <input
                              type="checkbox"
                              checked={creditSource === 'Buttons Flower Farm'}
                              onChange={(e) => {
                                if (onInventoryUpdate) {
                                  const value = e.target ? e.target.checked : false;
                                  const updates = {
                                    [`${fieldPrefix}CreditSource`]: value ? 'Buttons Flower Farm' : ''
                                  };
                                  const updatedInventory = { ...inventory, ...updates };
                                  onInventoryUpdate(updatedInventory);
                                }
                              }}
                            />
                            Add watermark (Photo credit: Button's Flower Farm)
                          </label>
                          
                          <div className="form-group">
                            <label>Photographer name (optional):</label>
                            <input
                              type="text"
                              value={creditSource !== 'Buttons Flower Farm' ? creditSource : ''}
                              onChange={(e) => {
                                if (onInventoryUpdate && e.target) {
                                  const updates = {
                                    [`${fieldPrefix}CreditSource`]: e.target.value
                                  };
                                  const updatedInventory = { ...inventory, ...updates };
                                  onInventoryUpdate(updatedInventory);
                                }
                              }}
                              placeholder="Enter photographer name"
                            />
                          </div>
                        </>
                      )}
                      
                      {creditType === 'commercial' && (
                        <>
                          <div className="form-group">
                            <label>Source Name:</label>
                            <select 
                              value={COMMERCIAL_SOURCES.find(s => s.name === creditSource)?.value || 'other'}
                              onChange={(e) => {
                                if (onInventoryUpdate && e.target) {
                                  const selectedSource = COMMERCIAL_SOURCES.find(s => s.value === e.target.value);
                                  const updates = {
                                    [`${fieldPrefix}CreditSource`]: selectedSource ? selectedSource.name : ''
                                  };
                                  const updatedInventory = { ...inventory, ...updates };
                                  onInventoryUpdate(updatedInventory);
                                }
                              }}
                            >
                              <option value="">Select source...</option>
                              {COMMERCIAL_SOURCES.map(source => (
                                <option key={source.value} value={source.value}>
                                  {source.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="form-group">
                            <label>Photographer name (optional):</label>
                            <input
                              type="text"
                              value={creditSource}
                              onChange={(e) => {
                                if (onInventoryUpdate && e.target) {
                                  const updates = {
                                    [`${fieldPrefix}CreditSource`]: e.target.value
                                  };
                                  const updatedInventory = { ...inventory, ...updates };
                                  onInventoryUpdate(updatedInventory);
                                }
                              }}
                              placeholder="Enter photographer name"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Upload Section */}
        <div className="upload-section">
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onClick={triggerFileInput}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
            />
            
            <div className="upload-instructions">
              <div className="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M12 5L7 10M12 5L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p>Drag images here or click to upload</p>
              <span className="upload-format">Supported formats: JPG, PNG, GIF (Max: 5MB)</span>
            </div>
          </div>
          
          <div className="url-input-form">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target ? e.target.value : '')}
              placeholder="Enter Firebase Storage URL (e.g., https://firebasestorage.googleapis.com/...)"
              className="url-input-field"
            />
            <div className="url-input-actions">
              <button type="button" className="url-submit-btn" onClick={handleUrlSubmit}>Upload URL</button>
              <button 
                type="button" 
                className="url-cancel-btn"
                onClick={() => {
                  setUrlInput('');
                  setError(null);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Photo Credit for New Uploads */}
        <div className="new-upload-credit-section">
          <h4>Photo Credit for New Uploads</h4>
          <div className="source-tabs">
            <button
              type="button"
              className={`source-tab ${imageSource === 'own' ? 'active' : ''}`}
              onClick={() => setImageSource('own')}
            >
              My Own Photo
            </button>
            <button
              type="button"
              className={`source-tab ${imageSource === 'commercial' ? 'active' : ''}`}
              onClick={() => setImageSource('commercial')}
            >
              Commercial Source
            </button>
          </div>

          {imageSource === 'commercial' && (
            <div className="commercial-source-fields">
              <div className="form-group">
                <label>Source Name:</label>
                <select 
                  value={commercialSource} 
                  onChange={(e) => setCommercialSource(e.target ? e.target.value : '')}
                >
                  <option value="">Select source...</option>
                  {COMMERCIAL_SOURCES.map(source => (
                    <option key={source.value} value={source.value}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {commercialSource === 'other' && (
                <div className="form-group">
                  <label>Custom Source Name:</label>
                  <input
                    type="text"
                    value={customSourceName}
                    onChange={(e) => setCustomSourceName(e.target ? e.target.value : '')}
                    placeholder="Enter source name"
                  />
                </div>
              )}
              
              <div className="form-group">
                <label>Source URL (optional):</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target ? e.target.value : '')}
                  placeholder="https://www.example.com/..."
                />
              </div>
            </div>
          )}

          {imageSource === 'own' && (
            <div className="own-photo-fields">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={addWatermark}
                    onChange={(e) => setAddWatermark(e.target ? e.target.checked : false)}
                  />
                  Add watermark (Photo credit: Button's Flower Farm)
                </label>
              </div>
              
              <div className="form-group">
                <label>Photographer name (optional):</label>
                <input
                  type="text"
                  value={photographerName}
                  onChange={(e) => setPhotographerName(e.target ? e.target.value : '')}
                  placeholder="Enter photographer name"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />
      
      <div className="upload-instructions">
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M12 5L7 10M12 5L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p>Drag images here or click to upload</p>
          <span className="upload-format">Supported formats: JPG, PNG, GIF (Max: 5MB)</span>
        </div>
      
    </div>
  );
};

export default ImageUploaderWithAttribution;