import React, { useState, useRef } from 'react';
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
  mainImageIndex = 0, 
  onUpload, 
  onMainSelect, 
  onRemoveImage,
  onMetadataUpdate,
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
      if (addWatermark) {
        metadata.source = "Buttons Flower Farm";
      }
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
              source: addWatermark ? "Buttons Flower Farm" : ""
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
      watermarked: (metadata.source === "Buttons Flower Farm") || false
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
      if (editMetadata.watermarked) {
        updatedMetadata.source = "Buttons Flower Farm";
      }
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
        return `Photo credit: ${metadata.photographer}`;
      } else if (metadata.source === "Buttons Flower Farm") {
        return `Photo credit: Buttons Flower Farm`;
      }
      return null;
    }
    return null;
  };

  return (
    <div className="image-uploader">
      {/* Attribution Options for New Uploads */}
      <div className="attribution-options">
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
                onChange={(e) => setCommercialSource(e.target.value)}
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
                  onChange={(e) => setCustomSourceName(e.target.value)}
                  placeholder="Enter source name"
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Source URL (optional):</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
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
                  onChange={(e) => setAddWatermark(e.target.checked)}
                />
                Add watermark (Photo credit: Buttons Flower Farm)
              </label>
            </div>
            
            <div className="form-group">
              <label>Photographer name (optional):</label>
              <input
                type="text"
                value={photographerName}
                onChange={(e) => setPhotographerName(e.target.value)}
                placeholder="Enter photographer name"
              />
            </div>
          </div>
        )}
      </div>

      <div 
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
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
      
      {showUrlInput && (
        <form className="url-input-form" onSubmit={handleUrlSubmit}>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter Firebase Storage URL (e.g., https://firebasestorage.googleapis.com/...)"
            className="url-input-field"
          />
          <div className="url-input-actions">
            <button type="submit" className="url-submit-btn">Upload URL</button>
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
        </form>
      )}
      
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <span>Uploading... {Math.round(uploadProgress)}%</span>
        </div>
      )}
      
      {error && (
        <div className="upload-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map((image, index) => {
            const isEditing = editingIndex === index;
            const attributionText = getAttributionText(image);
            
            return (
              <div 
                key={`${image}-${index}`} 
                className={`image-preview-item ${mainImageIndex === index ? 'main-image' : ''}`}
              >
                <div className="image-thumbnail">
                  <img src={image} alt={`Plant image ${index + 1}`} />
                  {attributionText && (
                    <div className="image-attribution">
                      {attributionText}
                    </div>
                  )}
                </div>
                
                <div className="image-controls">
                  <label className="main-image-toggle">
                    <input
                      type="radio"
                      name="mainImage"
                      checked={mainImageIndex === index}
                      onChange={() => onMainSelect(index)}
                    />
                    {mainImageIndex === index ? 'Main Image' : 'Set as Main'}
                  </label>
                  
                  {!isEditing && (
                    <>
                      <button 
                        className="edit-metadata-btn"
                        onClick={() => startEditingMetadata(index)}
                        title="Edit attribution"
                      >
                        Edit
                      </button>
                      
                      <button 
                        className="remove-image-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage(index);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                
                {isEditing && (
                  <div className="metadata-edit-form">
                    <div className="edit-form-tabs">
                      <button
                        type="button"
                        className={`edit-tab ${editMetadata.type === 'own' ? 'active' : ''}`}
                        onClick={() => setEditMetadata({...editMetadata, type: 'own'})}
                      >
                        Own Photo
                      </button>
                      <button
                        type="button"
                        className={`edit-tab ${editMetadata.type === 'commercial' ? 'active' : ''}`}
                        onClick={() => setEditMetadata({...editMetadata, type: 'commercial'})}
                      >
                        Commercial
                      </button>
                    </div>
                    
                    <div className="edit-form-content">
                      {editMetadata.type === 'commercial' && (
                        <>
                          <select
                            value={editMetadata.commercialSource || ''}
                            onChange={(e) => setEditMetadata({
                              ...editMetadata,
                              commercialSource: e.target.value,
                              customSourceName: e.target.value === 'other' ? editMetadata.customSourceName : ''
                            })}
                          >
                            <option value="">Select source...</option>
                            {COMMERCIAL_SOURCES.map(source => (
                              <option key={source.value} value={source.value}>
                                {source.name}
                              </option>
                            ))}
                          </select>
                          
                          {editMetadata.commercialSource === 'other' && (
                            <input
                              type="text"
                              value={editMetadata.customSourceName || ''}
                              onChange={(e) => setEditMetadata({
                                ...editMetadata,
                                customSourceName: e.target.value
                              })}
                              placeholder="Enter source name"
                            />
                          )}
                          
                          <input
                            type="url"
                            value={editMetadata.sourceUrl || ''}
                            onChange={(e) => setEditMetadata({
                              ...editMetadata,
                              sourceUrl: e.target.value
                            })}
                            placeholder="Source URL (optional)"
                          />
                        </>
                      )}
                      
                      {editMetadata.type === 'own' && (
                        <>
                          <label className="watermark-checkbox">
                            <input
                              type="checkbox"
                              checked={editMetadata.watermarked || false}
                              onChange={(e) => setEditMetadata({
                                ...editMetadata,
                                watermarked: e.target.checked
                              })}
                            />
                            Add watermark (Photo credit: Buttons Flower Farm)
                          </label>
                          
                          <input
                            type="text"
                            value={editMetadata.photographer || ''}
                            onChange={(e) => setEditMetadata({
                              ...editMetadata,
                              photographer: e.target.value
                            })}
                            placeholder="Photographer name (optional)"
                          />
                        </>
                      )}
                    </div>
                    
                    <div className="edit-actions">
                      <button onClick={saveEditedMetadata}>Save</button>
                      <button onClick={() => setEditingIndex(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageUploaderWithAttribution;