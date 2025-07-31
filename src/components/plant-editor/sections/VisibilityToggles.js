import React from 'react';

const VisibilityToggles = ({ flowerData, setFlowerData }) => {
  return (
    <>
      <div className="form-group toggle-group">
        <div className="toggle-container">
          <label htmlFor="toggle-featured" className="toggle-label">
            <span className="toggle-text">Featured Plant</span>
            <div className="toggle-control">
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
            </div>
          </label>
          <p className="toggle-description">
            Featured plants appear on the homepage carousel
          </p>
        </div>
      </div>

      <div className="form-group toggle-group">
        <div className="toggle-container">
          <label htmlFor="toggle-hidden" className="toggle-label">
            <span className="toggle-text">Hidden from Shop</span>
            <div className="toggle-control">
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
            </div>
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