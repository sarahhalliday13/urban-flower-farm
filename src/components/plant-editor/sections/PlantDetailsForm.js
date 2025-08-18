import React from 'react';

const PlantDetailsForm = ({ flowerData, setFlowerData }) => {
  return (
    <>
      <div className="details-section">
        <h3>Plant Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="plant-color">Color:</label>
            <input
              id="plant-color"
              type="text"
              value={flowerData.colour || ''}
              onChange={(e) => setFlowerData(prev => ({ ...prev, colour: e.target.value }))}
              placeholder="e.g., Pink, Yellow, Mixed"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="plant-light">Light Requirements:</label>
            <input
              id="plant-light"
              type="text"
              value={flowerData.light || ''}
              onChange={(e) => setFlowerData(prev => ({ ...prev, light: e.target.value }))}
              placeholder="e.g., Full sun, Partial shade"
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="plant-height">Height (cm):</label>
            <input
              id="plant-height"
              type="text"
              value={flowerData.height || ''}
              onChange={(e) => setFlowerData(prev => ({ ...prev, height: e.target.value }))}
              placeholder="e.g., 30-50"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="plant-spread">Spread (cm):</label>
            <input
              id="plant-spread"
              type="text"
              value={flowerData.spread || ''}
              onChange={(e) => setFlowerData(prev => ({ ...prev, spread: e.target.value }))}
              placeholder="e.g., 20-30"
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="plant-bloom">Bloom Season:</label>
            <input
              id="plant-bloom"
              type="text"
              value={flowerData.bloomSeason || ''}
              onChange={(e) => setFlowerData(prev => ({ ...prev, bloomSeason: e.target.value }))}
              placeholder="e.g., Summer, Spring-Fall"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="plant-type">Plant Type:</label>
            <input
              id="plant-type"
              type="text"
              value={flowerData.plantType || ''}
              onChange={(e) => setFlowerData(prev => ({ ...prev, plantType: e.target.value }))}
              placeholder="e.g., Annual, Perennial"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="hardiness-zone">Hardiness Zone:</label>
          <input
            id="hardiness-zone"
            type="text"
            value={flowerData.hardinessZone || ''}
            onChange={(e) => setFlowerData(prev => ({ ...prev, hardinessZone: e.target.value }))}
            placeholder="e.g., 4-9"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="planting-season">Planting Season:</label>
            <input
              id="planting-season"
              type="text"
              value={flowerData.plantingSeason || ''}
              onChange={(e) => setFlowerData(prev => ({ ...prev, plantingSeason: e.target.value }))}
              placeholder="e.g., Spring, Fall"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="planting-depth">Planting Depth (inches):</label>
            <input
              id="planting-depth"
              type="text"
              value={flowerData.plantingDepth || ''}
              onChange={(e) => setFlowerData(prev => ({ ...prev, plantingDepth: e.target.value }))}
              placeholder="e.g., 0.25, 1-2"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="mature-size">Mature Size:</label>
          <input
            id="mature-size"
            type="text"
            value={flowerData.size || ''}
            onChange={(e) => setFlowerData(prev => ({ ...prev, size: e.target.value }))}
            placeholder="e.g., 2-3 feet tall and wide"
          />
        </div>
      </div>
      
      <div className="details-section">
        <h3>Additional Information</h3>
        <div className="form-group">
          <label htmlFor="special-features">Special Features:</label>
          <textarea
            id="special-features"
            value={flowerData.specialFeatures || ''}
            onChange={(e) => setFlowerData(prev => ({ ...prev, specialFeatures: e.target.value }))}
            placeholder="Any unique characteristics of this plant"
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="plant-uses">Uses:</label>
          <textarea
            id="plant-uses"
            value={flowerData.uses || ''}
            onChange={(e) => setFlowerData(prev => ({ ...prev, uses: e.target.value }))}
            placeholder="How this plant can be used in gardens or landscapes"
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="plant-aroma">Aroma (if applicable):</label>
          <input
            id="plant-aroma"
            type="text"
            value={flowerData.aroma || ''}
            onChange={(e) => setFlowerData(prev => ({ ...prev, aroma: e.target.value }))}
            placeholder="Description of scent"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="care-tips">Care Tips:</label>
          <textarea
            id="care-tips"
            value={flowerData.careTips || ''}
            onChange={(e) => setFlowerData(prev => ({ ...prev, careTips: e.target.value }))}
            placeholder="Instructions for plant care"
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="gardening-tips">Gardening Tips:</label>
          <textarea
            id="gardening-tips"
            value={flowerData.gardeningTips || ''}
            onChange={(e) => setFlowerData(prev => ({ ...prev, gardeningTips: e.target.value }))}
            placeholder="Tips for growing this plant"
            rows="3"
          />
        </div>
      </div>
    </>
  );
};

export default PlantDetailsForm; 