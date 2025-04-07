import React from 'react';

const BasicInfoForm = ({ flowerData, setFlowerData }) => {
  return (
    <>
      <div className="form-group">
        <label htmlFor="flower-name">Name:</label>
        <input
          id="flower-name"
          type="text"
          value={flowerData.name}
          onChange={(e) => setFlowerData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="Enter flower name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="scientific-name">Scientific Name:</label>
        <input
          id="scientific-name"
          type="text"
          value={flowerData.scientificName}
          onChange={(e) => setFlowerData(prev => ({ ...prev, scientificName: e.target.value }))}
          placeholder="Enter scientific name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="price">Price:</label>
        <input
          id="price"
          type="number"
          value={flowerData.price}
          onChange={(e) => setFlowerData(prev => ({ ...prev, price: e.target.value }))}
          required
          min="0"
          step="0.01"
          placeholder="0.00"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          value={flowerData.description}
          onChange={(e) => setFlowerData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter flower description"
          rows="5"
        />
      </div>
    </>
  );
};

export default BasicInfoForm; 