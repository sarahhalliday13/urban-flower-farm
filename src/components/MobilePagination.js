import React from "react";
import "./MobilePagination.css";

const MobilePagination = ({ currentIndex, totalItems, onPrev, onNext }) => {
  return (
    <div className="mobile-pagination">
      <button
        className={`mobile-page-btn prev ${currentIndex === 0 ? "disabled" : ""}`}
        onClick={onPrev}
        disabled={currentIndex === 0}
      >
        &lt;
      </button>

      <div className="pagination-info">
        <span className="current-page">{currentIndex + 1}</span>
        <span className="page-separator">/</span>
        <span className="total-pages">{totalItems}</span>
      </div>

      <button
        className={`mobile-page-btn next ${currentIndex === totalItems - 1 ? "disabled" : ""}`}
        onClick={onNext}
        disabled={currentIndex === totalItems - 1}
      >
        &gt;
      </button>
    </div>
  );
};

export default MobilePagination;
