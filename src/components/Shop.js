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
  const [sortOption, setSortOption] = useState('status-in-stock');
  const [displayCount, setDisplayCount] = useState(12);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { width } = useWindowSize();

  // Add status counts calculation
  const getStatusCounts = useMemo(() => {
    const counts = {
      'all': plants.length,
      'In Stock': 0,
      'Low Stock': 0,
      'Sold Out': 0,
      'Coming Soon': 0,
      'Pre-order': 0
    };
    
    // Count plants for each status
    plants.forEach(plant => {
      const status = plant.inventory?.status;
      if (status === 'Pre-order' || status === 'Pre-Order') {
        counts['Pre-order']++;
      } else if (status && counts[status] !== undefined) {
        counts[status]++;
      } else if (!status && plant.inventory?.currentStock > 0) {
        counts['In Stock']++;
      } else if (!status) {
        counts['Sold Out']++;
      }
    });
    
    return counts;
  }, [plants]);

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
    // First filter out hidden plants
    const visiblePlants = plants.filter(plant => 
      plant.hidden !== true && 
      plant.hidden !== 'true' && 
      plant.hidden !== 1 && 
      plant.hidden !== '1'
    );
    
    // Then apply search filter
    const filteredPlants = visiblePlants.filter(plant => {
      const searchLower = searchTerm.toLowerCase();
      return (
        plant.name?.toLowerCase().includes(searchLower) ||
        plant.scientificName?.toLowerCase().includes(searchLower) ||
        plant.commonName?.toLowerCase().includes(searchLower)
      );
    });

    // Apply status filtering
    let statusFilteredPlants = [];
    if (sortOption === 'status-in-stock') {
      statusFilteredPlants = filteredPlants.filter(plant => 
        plant.inventory?.status === 'In Stock'
      );
    } else if (sortOption === 'status-low-stock') {
      statusFilteredPlants = filteredPlants.filter(plant => 
        plant.inventory?.status === 'Low Stock'
      );
    } else if (sortOption === 'status-sold-out') {
      statusFilteredPlants = filteredPlants.filter(plant => 
        plant.inventory?.status === 'Sold Out' || (!plant.inventory?.status && !plant.inventory?.currentStock)
      );
    } else if (sortOption === 'status-coming-soon') {
      statusFilteredPlants = filteredPlants.filter(plant => 
        plant.inventory?.status === 'Coming Soon'
      );
    } else if (sortOption === 'status-pre-order') {
      statusFilteredPlants = filteredPlants.filter(plant => 
        plant.inventory?.status === 'Pre-order' || plant.inventory?.status === 'Pre-Order'
      );
    } else if (sortOption === 'all') {
      statusFilteredPlants = filteredPlants;
    }
    
    // Apply sorting
    switch (sortOption) {
      case 'all':
        return [...statusFilteredPlants].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'status-in-stock':
      case 'status-low-stock':
      case 'status-sold-out':
      case 'status-coming-soon':
      case 'status-pre-order':
        return [...statusFilteredPlants].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      default:
        return [...statusFilteredPlants].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [plants, sortOption, searchTerm]);

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
      setDisplayCount(12);
    } else {
      setDisplayCount(12);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDisplayCount(12);
  };

  if (loading) return <div className="loading">Loading plants...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!plants || plants.length === 0) return <div className="error">No plants available</div>;

  return (
    <div className="shop-main">
      <section className="featured-plants">
        <div className="shop-header">
          <h2>Shop</h2>
          <div className="shop-controls">
            <div className="sort-control">
              <label htmlFor="sort-select">Sort by:</label>
              <select 
                id="sort-select" 
                value={sortOption} 
                onChange={handleSortChange}
                className="sort-select"
                aria-label="Sort plants by selected option"
              >
                <option value="all">All ({getStatusCounts.all})</option>
                <option value="status-in-stock">In Stock ({getStatusCounts['In Stock']})</option>
                <option value="status-low-stock">Low Stock ({getStatusCounts['Low Stock']})</option>
                <option value="status-sold-out">Sold Out ({getStatusCounts['Sold Out']})</option>
                <option value="status-coming-soon">Coming Soon ({getStatusCounts['Coming Soon']})</option>
                <option value="status-pre-order">Pre-order ({getStatusCounts['Pre-order']})</option>
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