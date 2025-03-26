import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Shop.css';
import { useCart } from '../context/CartContext';
import { fetchPlants, loadSamplePlants } from '../services/firebase';
import PlantImage from './PlantImage';
import useWindowSize from '../hooks/useWindowSize';

function Shop() {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortOption, setSortOption] = useState('status-in-stock'); // Changed default to status-in-stock
  const [displayCount, setDisplayCount] = useState(12); // Number of plants to display initially
  const [hasMore, setHasMore] = useState(true); // Flag to check if there are more plants to load
  const [searchTerm, setSearchTerm] = useState(''); // Search term state
  const [isSearching, setIsSearching] = useState(false);
  const [initialDisplayCount, setInitialDisplayCount] = useState(12);
  const { width } = useWindowSize();
  const [typeFilter, setTypeFilter] = useState('all'); // Add this state

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
        
        console.log('Fetched plants:', data);
        
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

  // Reset display count when sort option changes
  useEffect(() => {
    setDisplayCount(12);
  }, [sortOption]);

  // Sort plants based on selected option
  const sortedPlants = useMemo(() => {
    if (!plants.length) return [];
    
    // First filter by search term if present
    let filteredPlants = plants;
    if (searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase().trim();
      filteredPlants = plants.filter(plant => 
        (plant.name && plant.name.toLowerCase().includes(search)) || 
        (plant.description && plant.description.toLowerCase().includes(search)) ||
        (plant.plantType && plant.plantType.toLowerCase().includes(search)) ||
        (plant.color && plant.color.toLowerCase().includes(search)) ||
        (plant.flowerColor && plant.flowerColor.toLowerCase().includes(search)) ||
        (plant.foliageColor && plant.foliageColor.toLowerCase().includes(search))
      );
    }

    // Apply type filter if selected
    if (typeFilter !== 'all') {
      filteredPlants = filteredPlants.filter(plant => 
        plant.plantType?.toLowerCase() === typeFilter
      );
    }
    
    // Filter by inventory status if selected
    let statusFilteredPlants = filteredPlants;
    if (sortOption === 'status-in-stock') {
      statusFilteredPlants = filteredPlants.filter(plant => {
        const currentStock = plant.inventory?.currentStock || 0;
        return currentStock > 0 && (!plant.inventory?.status || plant.inventory.status === 'In Stock');
      });
    } else if (sortOption === 'status-coming-soon') {
      statusFilteredPlants = filteredPlants.filter(plant => 
        plant.inventory?.status && plant.inventory.status.toLowerCase() === 'coming soon'
      );
    } else if (sortOption === 'status-pre-order') {
      statusFilteredPlants = filteredPlants.filter(plant => 
        plant.inventory?.status && plant.inventory.status.toLowerCase() === 'pre-order'
      );
    }
    
    // Apply sorting
    switch (sortOption) {
      case 'name-a-z':
        return [...statusFilteredPlants].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'name-z-a':
        return [...statusFilteredPlants].sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      case 'type-annual':
        return [...statusFilteredPlants]
          .filter(plant => plant.plantType?.toLowerCase() === 'annual')
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'type-perennial':
        return [...statusFilteredPlants]
          .filter(plant => plant.plantType?.toLowerCase() === 'perennial')
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'type-a-z':
        return [...statusFilteredPlants].sort((a, b) => {
          const typeA = a.plantType || '';
          const typeB = b.plantType || '';
          return typeA.localeCompare(typeB) || (a.name || '').localeCompare(b.name || '');
        });
      case 'status-in-stock':
      case 'status-coming-soon':
      case 'status-pre-order':
        return [...statusFilteredPlants].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      default:
        return [...statusFilteredPlants].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [plants, sortOption, searchTerm, typeFilter]);

  // Check if there are more plants to load after sorted plants change
  useEffect(() => {
    setHasMore(sortedPlants.length > displayCount);
  }, [sortedPlants, displayCount]);

  // Get the plants to display based on current display count
  const displayedPlants = useMemo(() => {
    return sortedPlants.slice(0, displayCount);
  }, [sortedPlants, displayCount]);

  const handleAddToCart = (plant) => {
    // Try to add to cart and get result
    const added = addToCart(plant, 1);
    
    // Only show success message if item was actually added
    if (added) {
      // Dispatch the toast event for success
      const event = new CustomEvent('show-toast', {
        detail: {
          message: `${plant.name} has been added to your cart`,
          type: 'success',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
    }
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  const handleLoadMore = () => {
    // Increment based on screen size
    setDisplayCount(prevCount => prevCount + (width < 768 ? 12 : 24));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value === '') {
      setIsSearching(false);
      setDisplayCount(initialDisplayCount); // Reset display count when search is cleared
    } else {
      setIsSearching(true);
      setDisplayCount(initialDisplayCount); // Reset display count when search changes
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
    setDisplayCount(initialDisplayCount); // Reset display count when clearing search
  };

  // Update the handleTypeFilter function
  const handleTypeFilter = (type) => {
    if (type === typeFilter) {
      setTypeFilter('all');
    } else {
      setTypeFilter(type);
    }
  };

  if (loading) return <div className="loading">Loading plants...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!plants || plants.length === 0) return <div className="error">No plants available</div>;

  return (
    <div className={`shop-main ${viewMode === 'list' ? 'list-view-mode' : ''}`}>
      <section className="featured-plants">
        <div className="shop-header">
          <h2>Shop</h2>
          <div className="shop-controls">
            <div className="type-filters">
              <button 
                className={`type-filter-btn ${typeFilter === 'annual' ? 'active' : ''}`}
                onClick={() => handleTypeFilter('annual')}
              >
                Annual
              </button>
              <button 
                className={`type-filter-btn ${typeFilter === 'perennial' ? 'active' : ''}`}
                onClick={() => handleTypeFilter('perennial')}
              >
                Perennial
              </button>
            </div>
            <div className="sort-control">
              <label htmlFor="sort-select">Sort by:</label>
              <select 
                id="sort-select" 
                value={sortOption} 
                onChange={handleSortChange}
                className="sort-select"
                aria-label="Sort plants by selected option"
              >
                <option value="status-in-stock">Status: In Stock</option>
                <option value="status-coming-soon">Status: Coming Soon</option>
                <option value="status-pre-order">Status: Pre-Order</option>
                <option value="name-a-z">Common Name: A to Z</option>
              </select>
            </div>
            <div className="search-bar">
              <div className="search-input-container">
                <input 
                  type="text" 
                  placeholder="Search by keyword"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="search-input"
                  aria-label="Search plants"
                />
                {searchTerm && (
                  <button 
                    type="button" 
                    className="clear-search" 
                    onClick={clearSearch}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Add type headings when sorting by type */}
        {sortOption === 'type-a-z' ? (
          <>
            {/* Group plants by type */}
            {Object.entries(
              displayedPlants.reduce((acc, plant) => {
                const type = plant.plantType || 'Other';
                if (!acc[type]) acc[type] = [];
                acc[type].push(plant);
                return acc;
              }, {})
            ).map(([type, typePlants]) => (
              <div key={type} className="plant-type-group">
                <h3 className="plant-type-heading">{type}</h3>
                <div className="plant-grid">
                  {typePlants.map(plant => (
                    <div key={plant.id} className="plant-card" data-plant={plant.name}>
                      {/* Grid view only - removing conditional */}
                      <>
                        <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="plant-image">
                            <PlantImage plant={plant} height={250} width="100%" />
                          </div>
                          <h3 className="plant-common-name">{plant.name}</h3>
                          <p className="plant-description">
                            {plant.shortDescription || (plant.description ? plant.description.substring(0, 200) + (plant.description.length > 200 ? '...' : '') : '')}
                          </p>
                          <div className="plant-info-row">
                            <div className="badge-container">
                              {plant.inventory?.status ? (
                                <div className="plant-status" style={{ marginTop: '0px', marginBottom: '0px' }}>
                                  <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`} style={{ display: 'flex', alignItems: 'center' }}>
                                    {plant.inventory.status}
                                  </span>
                                </div>
                              ) : (
                                <div className="plant-status" style={{ marginTop: '0px', marginBottom: '0px' }}>
                                  <span className="status-badge in-stock" style={{ display: 'flex', alignItems: 'center' }}>In Stock</span>
                                </div>
                              )}
                              {plant.plantType && (
                                <div className="plant-type-badge" style={{ marginTop: '0px', marginBottom: '0px' }}>
                                  <span className={`type-badge ${plant.plantType?.toLowerCase().replace(/\s+/g, '-') || 'other'}`} style={{ display: 'flex', alignItems: 'center' }}>
                                    {plant.plantType}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="plant-price">${plant.price}</p>
                          </div>
                        </Link>
                        <div className="plant-actions">
                          <Link to={`/plant/${plant.id}`} className="plant-view">View</Link>
                          <button 
                            className={`plant-buy ${!plant.inventory?.currentStock ? 'sold-out' : ''}`}
                            onClick={() => handleAddToCart(plant)}
                            disabled={!plant.inventory?.currentStock}
                          >
                            {plant.inventory?.currentStock > 0 ? 'Buy' : 'Sold Out'}
                          </button>
                        </div>
                      </>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="load-more">
                <button onClick={handleLoadMore}>Load More</button>
              </div>
            )}
          </>
        ) : (
          <>
            {sortedPlants.length === 0 && searchTerm.trim() !== '' ? (
              <div className="no-results">
                <p>No plants found matching "<strong>{searchTerm}</strong>"</p>
                <button className="reset-search" onClick={clearSearch}>Clear search</button>
              </div>
            ) : (
              <div className="plant-grid">
                {displayedPlants.map(plant => {
                  return (
                    <div key={plant.id} className="plant-card" data-plant={plant.name}>
                      {/* Grid view only - removing conditional */}
                      <>
                        <Link to={`/plant/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="plant-image">
                            <PlantImage plant={plant} height={250} width="100%" />
                          </div>
                          <h3 className="plant-common-name">{plant.name}</h3>
                          <p className="plant-description">
                            {plant.shortDescription || (plant.description ? plant.description.substring(0, 200) + (plant.description.length > 200 ? '...' : '') : '')}
                          </p>
                          <div className="plant-info-row">
                            <div className="badge-container">
                              {plant.inventory?.status ? (
                                <div className="plant-status" style={{ marginTop: '0px', marginBottom: '0px' }}>
                                  <span className={`status-badge ${plant.inventory.status.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`} style={{ display: 'flex', alignItems: 'center' }}>
                                    {plant.inventory.status}
                                  </span>
                                </div>
                              ) : (
                                <div className="plant-status" style={{ marginTop: '0px', marginBottom: '0px' }}>
                                  <span className="status-badge in-stock" style={{ display: 'flex', alignItems: 'center' }}>In Stock</span>
                                </div>
                              )}
                              {plant.plantType && (
                                <div className="plant-type-badge" style={{ marginTop: '0px', marginBottom: '0px' }}>
                                  <span className={`type-badge ${plant.plantType?.toLowerCase().replace(/\s+/g, '-') || 'other'}`} style={{ display: 'flex', alignItems: 'center' }}>
                                    {plant.plantType}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="plant-price">${plant.price}</p>
                          </div>
                        </Link>
                        <div className="plant-actions">
                          <Link to={`/plant/${plant.id}`} className="plant-view">View</Link>
                          <button 
                            className={`plant-buy ${!plant.inventory?.currentStock ? 'sold-out' : ''}`}
                            onClick={() => handleAddToCart(plant)}
                            disabled={!plant.inventory?.currentStock}
                          >
                            {plant.inventory?.currentStock > 0 ? 'Buy' : 'Sold Out'}
                          </button>
                        </div>
                      </>
                    </div>
                  );
                })}
              </div>
            )}
            {hasMore && (
              <div className="load-more">
                <button onClick={handleLoadMore}>Load More</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default Shop;