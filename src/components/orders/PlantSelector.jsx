import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';

/**
 * PlantSelector - A dropdown component for selecting plants to add to an order
 * @param {Object} props - Component props
 * @param {Function} props.onAddItem - Function to call when a plant is selected to add
 */
const PlantSelector = ({ onAddItem }) => {
  const [plants, setPlants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlants, setFilteredPlants] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Load plants from Firebase
  useEffect(() => {
    setIsLoading(true);
    const database = getDatabase();
    const plantsRef = ref(database, 'plants');
    
    const unsubscribe = onValue(plantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const plantsData = snapshot.val();
        const plantsArray = Object.values(plantsData || {})
          .filter(plant => plant.id && plant.name && plant.hidden !== true)
          .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log("Loaded plants:", plantsArray.length);
        setPlants(plantsArray);
      } else {
        console.log("No plants found in database");
        setPlants([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading plants:', error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Filter plants based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPlants([]);
      return;
    }
    
    const searchTerm = searchQuery.toLowerCase().trim();
    const filtered = plants.filter(plant => {
      const nameMatch = plant.name && plant.name.toLowerCase().includes(searchTerm);
      const scientificMatch = plant.scientificName && plant.scientificName.toLowerCase().includes(searchTerm);
      return nameMatch || scientificMatch;
    });
    
    setFilteredPlants(filtered);
  }, [searchQuery, plants]);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsDropdownOpen(true);
  };

  // Handle selecting a plant from dropdown
  const handleSelectPlant = (plant) => {
    const itemToAdd = {
      id: plant.id,
      name: plant.name,
      price: plant.price || '0.00',
      quantity: 1
    };
    
    console.log("Adding plant to order:", itemToAdd);
    onAddItem(itemToAdd);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="plant-selector" ref={dropdownRef}>
      <div className="predictive-search-container">
        <input
          type="text"
          className="predictive-search-input"
          placeholder="Search plants..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => searchQuery && setIsDropdownOpen(true)}
        />
        
        {isDropdownOpen && filteredPlants.length > 0 && (
          <div className="predictive-dropdown">
            {filteredPlants.map(plant => (
              <div 
                key={plant.id} 
                className="dropdown-item"
                onClick={() => handleSelectPlant(plant)}
              >
                <span className="plant-name">{plant.name}</span>
                <span className="plant-price">${parseFloat(plant.price || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
        
        {isDropdownOpen && searchQuery && filteredPlants.length === 0 && (
          <div className="predictive-dropdown">
            <div className="no-results">No plants found</div>
          </div>
        )}
      </div>

      <style jsx>{`
        .predictive-search-container {
          position: relative;
          width: 100%;
        }
        
        .predictive-search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .predictive-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 300px;
          overflow-y: auto;
          background: white;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 4px 4px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          z-index: 10;
        }
        
        .dropdown-item {
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .dropdown-item:hover {
          background-color: #f8f9fa;
        }
        
        .dropdown-item:last-child {
          border-bottom: none;
        }
        
        .plant-name {
          font-weight: 500;
        }
        
        .plant-price {
          color: #2c5530;
          font-weight: 500;
        }
        
        .no-results {
          padding: 12px;
          text-align: center;
          color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default PlantSelector; 