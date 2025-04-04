import React from 'react';
import './MobilePagination.css';
import useWindowSize from '../hooks/useWindowSize';

function MobilePagination({ currentPage, totalPages, sortOption, searchTerm }) {
  const { width } = useWindowSize();

  if (width >= 991 || totalPages <= 1) {
    return null;
  }

  const createPageUrl = (pageNum) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageNum.toString());

    if (sortOption) url.searchParams.set('sort', sortOption);
    if (searchTerm && searchTerm.trim() !== '') url.searchParams.set('search', searchTerm);

    return url.toString();
  };

  return (
    <div className="mobile-pagination">
      <a 
        href={createPageUrl(Math.max(1, currentPage - 1))} 
        className={`mobile-pagination-prev ${currentPage === 1 ? 'disabled' : ''}`}
        aria-disabled={currentPage === 1}
      >
        Prev
      </a>
      
      <div className="mobile-pagination-info">
        <span className="current-page">{currentPage}</span> of {totalPages}
      </div>
      
      <a 
        href={createPageUrl(Math.min(totalPages, currentPage + 1))} 
        className={`mobile-pagination-next ${currentPage === totalPages ? 'disabled' : ''}`}
        aria-disabled={currentPage === totalPages}
      >
        Next
      </a>
    </div>
  );
}

export default MobilePagination;
