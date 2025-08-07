import React, { useState } from 'react';
import { listFirebaseImages } from '../services/firebase';
import '../styles/ImageRecovery.css';

const ImageRecovery = () => {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('both');
  const [scanProgress, setScanProgress] = useState('');
  const [filterUnused, setFilterUnused] = useState(false);
  const [allImages, setAllImages] = useState([]); // Store all images before filtering
  const [lastScanTime, setLastScanTime] = useState(null);
  const [usingCache, setUsingCache] = useState(false);

  // Cache management functions
  const CACHE_KEY = 'firebaseImageCache';
  const CACHE_TIMESTAMP_KEY = 'firebaseImageCacheTimestamp';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  const loadFromCache = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cacheTimestamp) {
        const timestamp = new Date(parseInt(cacheTimestamp));
        const age = Date.now() - timestamp.getTime();
        
        if (age < CACHE_DURATION) {
          const parsed = JSON.parse(cachedData);
          const cachedImages = parsed.images || [];
          const cachedFolders = parsed.folders || [];
          
          console.log(`Loading ${cachedImages.length} images from cache`);
          
          setAllImages(cachedImages);
          setImages(cachedImages); // Don't filter on initial load
          setFolders(cachedFolders);
          setLastScanTime(timestamp);
          setUsingCache(true);
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return false;
  };

  const saveToCache = (imageData, folderData) => {
    try {
      const cacheData = {
        images: imageData,
        folders: folderData
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      setLastScanTime(new Date());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    setLastScanTime(null);
    setUsingCache(false);
  };

  // Load cache on component mount
  React.useEffect(() => {
    const cacheLoaded = loadFromCache();
    if (!cacheLoaded) {
      // Only auto-scan if no cache exists
      console.log('No cache found, ready for manual scan');
    }
  }, []);

  const handleFilterToggle = () => {
    const newFilterState = !filterUnused;
    setFilterUnused(newFilterState);
    
    // Apply filter to existing results
    if (allImages.length > 0) {
      setImages(newFilterState ? allImages.filter(img => !img.inUse) : allImages);
    }
  };

  const handleListImages = async () => {
    setLoading(true);
    setError(null);
    setImages([]);
    setFolders([]);
    
    try {
      let allImages = [];
      let allFolders = [];
      
      // Scan based on selection
      if (selectedFolder === 'both' || selectedFolder === 'images') {
        try {
          setScanProgress('Scanning /images folder...');
          const imagesResult = await listFirebaseImages('images/', true); // Check usage
          console.log('Images folder contents:', imagesResult);
          allImages = allImages.concat(
            imagesResult.images.map(img => ({ ...img, folder: 'images' }))
          );
          allFolders = allFolders.concat(imagesResult.folders);
        } catch (err) {
          console.warn('Error scanning images/ folder:', err);
        }
      }
      
      if (selectedFolder === 'both' || selectedFolder === 'plants') {
        try {
          setScanProgress('Scanning /plants folder...');
          const plantsResult = await listFirebaseImages('plants/', true); // Check usage
          console.log('Plants folder contents:', plantsResult);
          allImages = allImages.concat(
            plantsResult.images.map(img => ({ ...img, folder: 'plants' }))
          );
          allFolders = allFolders.concat(plantsResult.folders);
        } catch (err) {
          console.warn('Error scanning plants/ folder:', err);
        }
      }
      
      setScanProgress('Checking image usage...');
      
      setAllImages(allImages);
      setImages(filterUnused ? allImages.filter(img => !img.inUse) : allImages);
      setFolders(allFolders);
      
      // Save to cache
      saveToCache(allImages, allFolders);
      setUsingCache(false);
      
      if (allImages.length === 0) {
        setError('No images found in the selected folder(s)');
      } else {
        const unusedCount = allImages.filter(img => !img.inUse).length;
        console.log(`Found ${allImages.length} total images, ${unusedCount} unused`);
      }
    } catch (err) {
      console.error('Error listing images:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="image-recovery">
      <h1>Firebase Image Recovery Tool</h1>
      <p>Discover and recover images from Firebase Storage</p>
      
      <div className="recovery-instructions">
        <p>
          <strong>How to use:</strong> Find unused images below, click the URL field to select and copy, 
          then paste into the plant editor's image field. 
          <br />
          <em>Tip: Open <a href="/admin/inventory" target="_blank" rel="noopener noreferrer">Inventory Manager</a> in a new tab to easily switch between tools.</em>
        </p>
      </div>
      
      <div className="recovery-actions">
        <div className="folder-selector">
          <label>Select folder to scan:</label>
          <select 
            value={selectedFolder} 
            onChange={(e) => setSelectedFolder(e.target.value)}
            disabled={loading}
          >
            <option value="both">Both /images and /plants</option>
            <option value="images">Only /images</option>
            <option value="plants">Only /plants</option>
          </select>
        </div>
        
        <button 
          onClick={handleListImages} 
          disabled={loading}
          className="primary-button"
        >
          {loading ? 'Scanning...' : usingCache ? 'Refresh Scan' : 'Scan Firebase Storage'}
        </button>
        
        {lastScanTime && (
          <div className="cache-info">
            {usingCache ? '📦 Using cached data from ' : '🔄 Last scan: '}
            {lastScanTime.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
            {usingCache && (
              <button 
                onClick={clearCache} 
                className="clear-cache-btn"
                title="Clear cache and force new scan"
              >
                ❌
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Scanning Firebase Storage...</div>
          <div className="loading-details">{scanProgress}</div>
        </div>
      )}

      {!loading && allImages.length > 0 && (
        <div className="recovery-results">
          <div className="results-header">
            <h2>
              Found {images.length} {filterUnused ? 'unused' : ''} images
              {allImages.length !== images.length && ` (${allImages.length} total)`}
            </h2>
            <div className="filter-controls">
              <label className="filter-checkbox">
                <input 
                  type="checkbox" 
                  checked={filterUnused}
                  onChange={handleFilterToggle}
                />
                Show only unused images
              </label>
              <span className="usage-stats">
                {allImages.filter(img => img.inUse).length} in use, 
                {' '}{allImages.filter(img => !img.inUse).length} unused
              </span>
            </div>
          </div>
          
          <div className="image-grid">
            {images.map((image, index) => (
              <div key={index} className="image-item">
                <div className="image-preview">
                  <img src={image.url} alt={image.name} />
                </div>
                <div className="image-info">
                  <div className="image-header">
                    <h4>{image.name}</h4>
                    <span className={`usage-badge ${image.inUse ? 'in-use' : 'unused'}`}>
                      {image.inUse ? 'In Use' : 'Unused'}
                    </span>
                  </div>
                  <p>Folder: /{image.folder}/</p>
                  <p>Potential Plant: {image.potentialPlantName}</p>
                  {image.inUse && image.usedBy.length > 0 && (
                    <p className="used-by">
                      Used by: {image.usedBy.map(plant => plant.name).join(', ')}
                    </p>
                  )}
                  <p className="image-size">Size: {(image.size / 1024).toFixed(1)} KB</p>
                  <p className="image-date">
                    Uploaded: {new Date(image.created).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="image-source">Source: {image.source}</p>
                  {/* Show any custom metadata */}
                  {Object.keys(image.customMetadata).length > 0 && (
                    <div className="custom-metadata">
                      <small>Metadata:</small>
                      {Object.entries(image.customMetadata).map(([key, value]) => (
                        <small key={key}>{key}: {value}</small>
                      ))}
                    </div>
                  )}
                  <div className="image-url">
                    <input 
                      type="text" 
                      value={image.url} 
                      readOnly 
                      onClick={async (e) => {
                        try {
                          await navigator.clipboard.writeText(image.url);
                          // Show feedback
                          const originalValue = e.target.value;
                          e.target.value = '✓ Copied!';
                          e.target.style.color = '#27ae60';
                          e.target.style.fontWeight = 'bold';
                          
                          setTimeout(() => {
                            e.target.value = originalValue;
                            e.target.style.color = '';
                            e.target.style.fontWeight = '';
                          }, 1500);
                        } catch (err) {
                          console.error('Failed to copy:', err);
                          // Fallback to select
                          e.target.select();
                        }
                      }}
                      title="Click to copy URL"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {folders.length > 0 && (
        <div className="folder-list">
          <h3>Subfolders found:</h3>
          <ul>
            {folders.map((folder, index) => (
              <li key={index}>{folder.fullPath}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageRecovery;