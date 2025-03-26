import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function NewAddFlower() {
  const [flowerData, setFlowerData] = useState({
    name: '',
    scientificName: '',
    price: '',
    status: 'In Stock',
    image: null
  });

  const handleImageSelect = (e) => {
    console.log('File picker triggered');
    const file = e.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    console.log('File selected:', file.name);
    setFlowerData(prev => ({
      ...prev,
      image: file
    }));
    
    // Reset the file input
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form data:', flowerData);
    // Handle form submission here
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Add New Flower</h1>
        <Link 
          to="/admin/new-inventory"
          style={{
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Back to Inventory
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="image-upload" style={{ display: 'block', marginBottom: '5px' }}>Select Image:</label>
            <input
              id="image-upload"
              type="file"
              onChange={handleImageSelect}
              accept="image/*"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
            <input
              type="text"
              value={flowerData.name}
              onChange={(e) => setFlowerData({ ...flowerData, name: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Scientific Name:</label>
            <input
              type="text"
              value={flowerData.scientificName}
              onChange={(e) => setFlowerData({ ...flowerData, scientificName: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Price:</label>
            <input
              type="text"
              value={flowerData.price}
              onChange={(e) => setFlowerData({ ...flowerData, price: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Status:</label>
            <select
              value={flowerData.status}
              onChange={(e) => setFlowerData({ ...flowerData, status: e.target.value })}
              style={inputStyle}
            >
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Add Flower
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  boxSizing: 'border-box'
};

export default NewAddFlower; 