import React, { useState, useRef } from 'react';

const ImageUploader = ({ 
  images = [], 
  setImages, 
  mainImage, 
  setMainImage,
  isUploading = false 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
      e.target.value = ''; // Reset the input for future uploads
    }
  };

  const handleFiles = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      const newImages = imageFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        isNew: true
      }));

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      
      // If no main image is set, use the first image
      if (!mainImage && newImages.length > 0) {
        setMainImage(newImages[0].preview);
      }
    }
  };

  const handleRemoveImage = (index) => {
    const updatedImages = [...images];
    const removedImage = updatedImages[index];
    
    // Revoke object URL to avoid memory leaks
    if (removedImage.isNew && removedImage.preview) {
      URL.revokeObjectURL(removedImage.preview);
    }
    
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    
    // If the main image was removed, set a new main image or empty string
    if (removedImage.preview === mainImage || removedImage.url === mainImage) {
      const newMainImage = updatedImages.length > 0 
        ? (updatedImages[0].preview || updatedImages[0].url) 
        : '';
      setMainImage(newMainImage);
    }
  };

  const handleSetMainImage = (index) => {
    const image = images[index];
    setMainImage(image.preview || image.url);
  };

  return (
    <div className="form-group">
      <label>Images:</label>
      <div className="upload-controls">
        <div style={{ marginBottom: '15px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="file-input"
          />
          <button 
            type="button"
            className="upload-button"
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
          >
            <span>Select Images</span>
          </button>
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
            <p className="upload-subtext">You can select multiple images</p>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="image-grid">
          {images.map((img, index) => (
            <div 
              key={index} 
              className={`image-item ${(img.preview === mainImage || img.url === mainImage) ? 'main' : ''}`}
            >
              <img 
                src={img.preview || img.url} 
                alt={`Image ${index + 1}`} 
                onError={(e) => {
                  console.error('Image failed to load:', img);
                  e.target.src = 'https://via.placeholder.com/150?text=Error';
                }}
              />
              <div className="image-actions">
                <button 
                  type="button"
                  onClick={() => handleSetMainImage(index)}
                  title="Set as main image"
                  className="main-image-btn"
                >
                  {(img.preview === mainImage || img.url === mainImage) ? '★' : '☆'}
                </button>
                <button 
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  title="Remove image"
                  className="remove-image-btn"
                >
                  ×
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