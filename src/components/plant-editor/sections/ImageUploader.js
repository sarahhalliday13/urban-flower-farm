import React, { useState, useRef } from 'react';
import { uploadImageToFirebase } from '../../../services/firebase';
import '../../../styles/ImageUploader.css';

const ImageUploader = ({ 
  images = [], 
  mainImageIndex = 0, 
  onUpload, 
  onMainSelect, 
  onRemoveImage 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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
          
          // Upload to Firebase
          const imageUrl = await uploadImageToFirebase(file);
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
        // Add new images to existing ones
        const newImages = [...images, ...validUrls];
        onUpload(newImages);
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

  return (
    <div className="image-uploader">
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
          {images.map((image, index) => (
            <div 
              key={`${image}-${index}`} 
              className={`image-preview-item ${mainImageIndex === index ? 'main-image' : ''}`}
            >
              <div className="image-thumbnail">
                <img src={image} alt={`Plant image ${index + 1}`} />
              </div>
              
              <div className="image-controls">
                <label className="main-image-toggle">
                  <input
                    type="radio"
                    name="mainImage"
                    checked={mainImageIndex === index}
                    onChange={() => onMainSelect(index)}
                  />
                  Main Image
                </label>
                
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader; 