import React from 'react';

const VisibilityToggles = ({ flowerData, setFlowerData }) => {
  return (
    <>
      <div className="form-group toggle-group">
        <div className="toggle-container">
          <label htmlFor="toggle-featured" className="toggle-label">
            Featured Plant
            <input
              id="toggle-featured"
              type="checkbox"
              checked={flowerData.featured === true || flowerData.featured === 'true'}
              onChange={(e) => setFlowerData(prev => ({
                ...prev,
                featured: e.target.checked
              }))}
              className="toggle-input"
            />
            <span className="toggle-switch"></span>
          </label>
          <p className="toggle-description">
            Featured plants appear on the homepage carousel
          </p>
        </div>
      </div>

      <div className="form-group toggle-group">
        <div className="toggle-container">
          <label htmlFor="toggle-hidden" className="toggle-label">
            Hidden from Shop
            <input
              id="toggle-hidden"
              type="checkbox"
              checked={flowerData.hidden === true || flowerData.hidden === 'true'}
              onChange={(e) => setFlowerData(prev => ({
                ...prev,
                hidden: e.target.checked
              }))}
              className="toggle-input"
            />
            <span className="toggle-switch"></span>
          </label>
          <p className="toggle-description">
            Hidden plants won't appear in the online shop
          </p>
        </div>
      </div>
    </>
  );
};

export default VisibilityToggles; 