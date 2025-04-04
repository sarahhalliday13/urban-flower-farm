import React, { useState, useEffect } from 'react';
import '../styles/UpdatesPage.css';
import { fetchNewsItems } from '../services/firebase';

const UpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load news updates from Firebase
  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Get news from Firebase
        const newsData = await fetchNewsItems();
        
        if (!newsData || newsData.length === 0) {
          setError('No news available at this time.');
          setLoading(false);
          return;
        }
        
        // Convert date strings to Date objects
        const processedData = newsData.map(item => ({
          ...item,
          date: new Date(item.date)
        }));
        
        setUpdates(processedData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading news from Firebase:', error);
        setError('Unable to load news. Please try again later.');
        setLoading(false);
      }
    };

    // Add a slight delay for smoother UX
    const timer = setTimeout(() => {
      fetchNews();
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="updates-page-container">
        <h1>News</h1>
        <div className="updates-loading">Loading updates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="updates-page-container">
        <h1>News</h1>
        <div className="updates-error">{error}</div>
      </div>
    );
  }

  // Group updates by year
  const updatesByYear = updates.reduce((acc, update) => {
    const year = update.date.getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(update);
    return acc;
  }, {});

  // Sort years in descending order
  const sortedYears = Object.keys(updatesByYear).sort((a, b) => b - a);

  return (
    <div className="updates-page-container">
      <h1>News</h1>
      
      {sortedYears.map(year => {
        // Sort updates within each year by date (newest first)
        const yearUpdates = updatesByYear[year].sort((a, b) => 
          b.date.getTime() - a.date.getTime()
        );
        
        return (
          <div key={year} className="updates-year-section">
            <h2 className="year-heading">{year}</h2>
            <div className="updates-grid">
              {yearUpdates.map(update => (
                <div key={update.id} className="update-card">
                  <div className="update-card-header">
                    <h3 className="update-title">{update.subject}</h3>
                    <span className="update-date">
                      {update.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="update-content">{update.content}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UpdatesPage; 