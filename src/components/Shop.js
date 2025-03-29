/* eslint-disable no-undef */  

import React, { useState, useEffect, useMemo, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { useLocation, useNavigate } from 'react-router-dom';
import './Shop.css';
import { useCart } from '../context/CartContext';
import { fetchPlants, loadSamplePlants } from '../services/firebase';
import PlantImage from './PlantImage';
import useWindowSize from '../hooks/useWindowSize';

function Shop() {
  const location = useLocation();
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('status-in-stock');
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { width } = useWindowSize();
  // eslint-disable-next-line no-unused-vars
  const [dataLoaded, setDataLoaded] = useState(false);
  /* eslint-disable no-unused-vars */
  const scrollRef = useRef(null);
  const pageRef = useRef(null);
  const plantRefs = useRef({});
  const lastFocusedPlantRef = useRef(null);
  const shopRef = useRef(null);
  /* eslint-enable no-unused-vars */
  // eslint-disable-next-line no-unused-vars
  const searchInputRef = useRef(null);
  
  // Update currentPage from URL when location.search changes
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const page = parseInt(search.get('page'), 10);
    setCurrentPage(isNaN(page) ? 1 : page);
  }, [location.search]);
  
  // Initialize sortOption and searchTerm from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // Get sort parameter from URL
    const sortParam = params.get('sort');
    if (sortParam) {
      setSortOption(sortParam);
    }
    
    // Get search parameter from URL
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [location.search]);
  
  // Store current page in localStorage
  useEffect(() => {
    // Save the current page number to localStorage
    localStorage.setItem('shopCurrentPage', currentPage.toString());
    console.log('Stored page in localStorage:', currentPage);
  }, [currentPage]);
  
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
        setDataLoaded(true);
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
      // Only count visible plants
      if (plant.hidden === true || plant.hidden === 'true' || plant.hidden === 1 || plant.hidden === '1') {
        return;
      }
      
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
    
    // Update all count to be the sum of visible plants
    counts['all'] = Object.values(counts).reduce((sum, count) => sum + count, 0) - counts['all'];
    
    return counts;
  }, [plants]);

  // Sort plants based on selected option
  const sortedPlants = useMemo(() => {
    // First filter out hidden plants
    const visiblePlants = plants.filter(plant => 
      plant.hidden !== true && 
      plant.hidden !== 'true' && 
      plant.hidden !== 1 && 
      plant.hidden !== '1'
    );
    
    console.log('Total visible plants (not hidden):', visiblePlants.length);
    
    // Then apply search filter
    const filteredPlants = visiblePlants.filter(plant => {
      if (!searchTerm.trim()) return true;
      
      // Split search terms by spaces and filter out empty strings
      const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      
      // Define special keywords and their corresponding filters
      const specialKeywords = {
        'perennial': (plant) => plant.plantType?.toLowerCase() === 'perennial',
        'annual': (plant) => plant.plantType?.toLowerCase() === 'annual',
        'pink': (plant) => plant.name?.toLowerCase().includes('pink') || 
                          plant.description?.toLowerCase().includes('pink') ||
                          plant.shortDescription?.toLowerCase().includes('pink'),
        'red': (plant) => plant.name?.toLowerCase().includes('red') || 
                         plant.description?.toLowerCase().includes('red') ||
                         plant.shortDescription?.toLowerCase().includes('red'),
        'white': (plant) => plant.name?.toLowerCase().includes('white') || 
                           plant.description?.toLowerCase().includes('white') ||
                           plant.shortDescription?.toLowerCase().includes('white'),
        'purple': (plant) => plant.name?.toLowerCase().includes('purple') || 
                            plant.description?.toLowerCase().includes('purple') ||
                            plant.shortDescription?.toLowerCase().includes('purple'),
        'yellow': (plant) => plant.name?.toLowerCase().includes('yellow') || 
                            plant.description?.toLowerCase().includes('yellow') ||
                            plant.shortDescription?.toLowerCase().includes('yellow'),
        'blue': (plant) => plant.name?.toLowerCase().includes('blue') || 
                          plant.description?.toLowerCase().includes('blue') ||
                          plant.shortDescription?.toLowerCase().includes('blue')
      };

      // Separate special keywords from regular search terms
      const specialTerms = searchTerms.filter(term => specialKeywords[term]);
      const regularTerms = searchTerms.filter(term => !specialKeywords[term]);

      // Apply special keyword filters
      const passesSpecialFilters = specialTerms.length === 0 || 
        specialTerms.every(term => specialKeywords[term](plant));

      // If there are no regular terms, only check special filters
      if (regularTerms.length === 0) {
        return passesSpecialFilters;
      }

      // First try to match the entire regular search term as one phrase
      const fullSearchTerm = regularTerms.join(' ').toLowerCase();
      const fullMatch = 
        plant.name?.toLowerCase().includes(fullSearchTerm) ||
        plant.scientificName?.toLowerCase().includes(fullSearchTerm) ||
        plant.commonName?.toLowerCase().includes(fullSearchTerm) ||
        plant.plantType?.toLowerCase().includes(fullSearchTerm);

      // If full match works, return true (and check special filters)
      if (fullMatch) return passesSpecialFilters;

      // If no full match, try matching individual terms (AND logic)
      const passesRegularSearch = regularTerms.every(term => 
        plant.name?.toLowerCase().includes(term) ||
        plant.scientificName?.toLowerCase().includes(term) ||
        plant.commonName?.toLowerCase().includes(term) ||
        plant.plantType?.toLowerCase().includes(term)
      );

      return passesRegularSearch && passesSpecialFilters;
    });
    
    console.log('Plants after search filter:', filteredPlants.length);

    // Apply status filtering
    let statusFilteredPlants = [];
    if (sortOption === 'status-in-stock') {
      statusFilteredPlants = filteredPlants.filter(plant => 
        plant.inventory?.status === 'In Stock' || 
        plant.inventory?.status === 'Low Stock' ||
        (plant.inventory?.currentStock > 0 && !plant.inventory?.status)
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
    
    console.log('Plants after status filter:', statusFilteredPlants.length, 'with sortOption:', sortOption);
    
    // Apply sorting
    switch (sortOption) {
      case 'all':
        return [...statusFilteredPlants].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'status-in-stock':
      case 'status-sold-out':
      case 'status-coming-soon':
      case 'status-pre-order':
        return [...statusFilteredPlants].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      default:
        return [...statusFilteredPlants].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [plants, sortOption, searchTerm]);

  // Calculate items per page based on screen width
  useEffect(() => {
    // Adjust items per page based on the total number of plants
    const totalPlants = sortedPlants.length;
    
    // Default settings based on screen width
    let defaultPerPage = width < 768 ? 12 : 24;
    
    // If we have few plants, adjust to show all
    if (totalPlants > 0 && totalPlants < defaultPerPage) {
      defaultPerPage = totalPlants;
    }
    
    console.log(`Setting itemsPerPage to ${defaultPerPage} based on screen width ${width} and ${totalPlants} plants`);
    setItemsPerPage(defaultPerPage);
  }, [width, sortedPlants.length]);

  // Pagination logic with logging
  const totalItems = sortedPlants.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedPlants.slice(indexOfFirstItem, indexOfLastItem);
  
  console.log('Pagination details:', {
    totalItems,
    itemsPerPage,
    totalPages,
    currentPage,
    indexOfFirstItem,
    indexOfLastItem,
    itemsShowing: currentItems.length
  });
  
  // Scroll to last viewed plant when returning to shop - MOVED AFTER currentItems is defined
  useEffect(() => {
    // Only run after plants are loaded and we're not loading
    if (!loading && plants.length > 0) {
      // Get the last viewed plant ID from localStorage
      const lastViewedPlantId = localStorage.getItem('lastViewedPlantId');
      if (lastViewedPlantId) {
        console.log('Trying to scroll to plant ID:', lastViewedPlantId);
        
        // Need to delay slightly to ensure the DOM is fully rendered
        setTimeout(() => {
          const plantElement = document.getElementById(`plant-${lastViewedPlantId}`);
          if (plantElement) {
            console.log('Found plant element, scrolling into view');
            // Scroll the element into view with a slight offset from the top
            plantElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a highlight effect that fades out
            plantElement.classList.add('highlight-card');
            setTimeout(() => {
              plantElement.classList.remove('highlight-card');
            }, 2000);
            
            // Clear the ID after we've scrolled to it
            localStorage.removeItem('lastViewedPlantId');
          } else {
            console.log('Plant element not found in current page');
          }
        }, 500);
      }
    }
  }, [loading, plants, currentItems]);

  // Generate pagination controls
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    
    // Always show first page
    pageNumbers.push(1);
    
    // Show current page and neighbors
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(currentPage + 1, totalPages - 1); i++) {
      if (!pageNumbers.includes(i)) {
        pageNumbers.push(i);
      }
    }
    
    // Always show last page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    // Sort and add ellipses
    const sortedPageNumbers = [...new Set(pageNumbers)].sort((a, b) => a - b);
    const paginationItems = [];
    
    for (let i = 0; i < sortedPageNumbers.length; i++) {
      const pageNumber = sortedPageNumbers[i];
      
      // Add ellipsis if there's a gap
      if (i > 0 && pageNumber - sortedPageNumbers[i - 1] > 1) {
        paginationItems.push(
          <span key={`ellipsis-${i}`} className="pagination-ellipsis">...</span>
        );
      }
      
      // Use anchors (not buttons) to allow proper navigation from details view
      paginationItems.push(
        <a
          key={pageNumber}
          href={`/shop?page=${pageNumber}&sort=${sortOption}${searchTerm ? `&search=${searchTerm}` : ''}`}
          className={`pagination-link ${pageNumber === currentPage ? 'active' : ''}`}
        >
          {pageNumber}
        </a>
      );
    }
    
    return (
      <div className="pagination-controls">
        <a
          href={`/shop?page=${Math.max(1, currentPage - 1)}&sort=${sortOption}${searchTerm ? `&search=${searchTerm}` : ''}`}
          className={`pagination-link prev ${currentPage === 1 ? 'disabled' : ''}`}
        >
          ← Prev
        </a>
        
        {paginationItems}
        
        <a
          href={`/shop?page=${Math.min(totalPages, currentPage + 1)}&sort=${sortOption}${searchTerm ? `&search=${searchTerm}` : ''}`}
          className={`pagination-link next ${currentPage === totalPages ? 'disabled' : ''}`}
        >
          Next →
        </a>
      </div>
    );
  };

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

  // Render a plant card
  const renderPlantCard = (plant) => {
    return (
      <div key={plant.id} className="plant-card" id={`plant-${plant.id}`}>
        <a 
          href={`/plant/${plant.id}`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          onClick={() => {
            // Store current page for when user comes back
            localStorage.setItem('shopCurrentPage', currentPage.toString());
            // Store which plant was clicked (for anchor navigation)
            localStorage.setItem('lastViewedPlantId', plant.id.toString());
          }}
        >
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
        </a>
        <div className="plant-actions">
          <a href={`/plant/${plant.id}`} className="plant-view">View</a>
          <button 
            className={`plant-buy ${(!plant.inventory?.currentStock || (plant.inventory?.status === 'Coming Soon' && !plant.inventory?.currentStock)) ? 'sold-out' : ''}`}
            onClick={() => handleAddToCart(plant)}
            disabled={!plant.inventory?.currentStock}
          >
            {plant.inventory?.status === 'Coming Soon' ? 
              (plant.inventory?.currentStock > 0 ? 'Buy' : 'Coming Soon') : 
              (plant.inventory?.currentStock > 0 ? 'Buy' : 'Sold Out')}
          </button>
        </div>
      </div>
    );
  };

  // Add useEffect to listen for popstate events (browser back/forward)
  useEffect(() => {
    const handlePopState = (event) => {
      // Parse URL parameters again when browser back/forward is used
      const params = new URLSearchParams(window.location.search);
      
      // Update sort option from URL
      const sortParam = params.get('sort');
      if (sortParam) {
        setSortOption(sortParam);
      }
      
      // Update search term from URL
      const searchParam = params.get('search');
      if (searchParam !== null) {
        setSearchTerm(searchParam);
      } else {
        setSearchTerm('');
      }
      
      // Update page number from URL
      const pageParam = params.get('page');
      if (pageParam) {
        const page = parseInt(pageParam, 10);
        if (!isNaN(page)) {
          setCurrentPage(page);
        }
      }
    };
    
    // Add event listener for popstate (back/forward button)
    window.addEventListener('popstate', handlePopState);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  if (loading) return <div className="loading">Loading plants...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!plants || plants.length === 0) return <div className="error">No plants available</div>;

  return (
    <div className="shop-main">
      <section className="featured-plants">
        <div className="shop-header">
          <h2>Shop</h2>
          
          <div className="shop-controls">
            <div className="filter-wrapper">
              <div className="sort-control">
                <label htmlFor="sort-select">Sort by:</label>
                <form method="get" action="/shop" style={{ display: 'inline' }}>
                  <select 
                    id="sort-select" 
                    name="sort"
                    value={sortOption} 
                    onChange={(e) => e.target.form.submit()}
                    className="sort-select"
                    aria-label="Sort plants by selected option"
                  >
                    <option value="all">All ({getStatusCounts.all})</option>
                    <option value="status-in-stock">In Stock ({getStatusCounts['In Stock'] + getStatusCounts['Low Stock']})</option>
                    <option value="status-sold-out">Sold Out ({getStatusCounts['Sold Out']})</option>
                    <option value="status-coming-soon">Coming Soon ({getStatusCounts['Coming Soon']})</option>
                    <option value="status-pre-order">Pre-order ({getStatusCounts['Pre-order']})</option>
                  </select>
                  <input type="hidden" name="page" value="1" />
                  {searchTerm && <input type="hidden" name="search" value={searchTerm} />}
                </form>
              </div>
              
              <div className="search-bar">
                <form className="search-input-container" method="get" action="/shop">
                  <label htmlFor="search-input">Search:</label>
                  <div style={{ position: 'relative', flex: '1', minWidth: 0 }}>
                    <input 
                      type="text" 
                      id="search-input"
                      name="search"
                      placeholder="Search plants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                      aria-label="Search plants"
                    />
                    {searchTerm && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setSearchTerm('');
                          window.location.href = `/shop?page=1&sort=${sortOption}`;
                        }}
                        className="clear-search"
                        aria-label="Clear search"
                        tabIndex="-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <input type="hidden" name="page" value="1" />
                  <input type="hidden" name="sort" value={sortOption} />
                  <button type="submit" style={{display: 'none'}}>Search</button>
                </form>
              </div>
            </div>
            
            {/* Top pagination moved inside shop-controls */}
            {renderPaginationControls()}
          </div>
        </div>
        
        {/* Add type headings when sorting by type */}
        {sortOption === 'type-a-z' ? (
          <>
            {/* Group plants by type */}
            {Object.entries(
              currentItems.reduce((acc, plant) => {
                const type = plant.plantType || 'Other';
                if (!acc[type]) acc[type] = [];
                acc[type].push(plant);
                return acc;
              }, {})
            ).map(([type, typePlants]) => (
              <div key={type} className="plant-type-group">
                <h3 className="plant-type-heading">{type}</h3>
                <div className="plant-grid">
                  {typePlants.map(plant => renderPlantCard(plant))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {sortedPlants.length === 0 && searchTerm.trim() !== '' ? (
              <div className="no-results">
                <p>No plants found matching "<strong>{searchTerm}</strong>"</p>
                <button className="reset-search" onClick={() => {
                  setSearchTerm('');
                  window.location.href = `/shop?page=1&sort=${sortOption}`;
                }}>Clear search</button>
              </div>
            ) : (
              <div className="plant-grid">
                {currentItems.map(plant => renderPlantCard(plant))}
              </div>
            )}
          </>
        )}
        
        {/* Page info - showing X of Y items */}
        {sortedPlants.length > 0 && (
          <div className="pagination-info">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, sortedPlants.length)} of {sortedPlants.length} items
            {sortOption !== 'all' && (
              <span> (filtered from {getStatusCounts.all} total)</span>
            )}
          </div>
        )}
        
        {/* Bottom pagination for mobile */}
        <div className="pagination-bottom">
          {renderPaginationControls()}
        </div>
      </section>
    </div>
  );
}

export default Shop;