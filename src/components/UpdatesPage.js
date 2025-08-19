import React, { useState, useEffect } from 'react';
import '../styles/UpdatesPage.css';
import { fetchNewsItems } from '../services/firebase';

const UpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  // Toggle expanded state for an item
  const toggleExpanded = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Generate preview text from content
  const getPreviewText = (content, maxLength = 150) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    
    // Find the last space before maxLength to avoid cutting words
    const trimmed = content.substring(0, maxLength);
    const lastSpace = trimmed.lastIndexOf(' ');
    return trimmed.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
  };

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
        
        // Convert date strings to Date objects and sort by pinned first, then date
        const processedData = newsData.map(item => ({
          ...item,
          date: new Date(item.date),
          isPinned: item.isPinned || false
        }));
        
        // Sort: pinned items first, then by date (newest first)
        processedData.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.date.getTime() - a.date.getTime();
        });
        
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

  return (
    <div className="updates-page-container">
      <h1>News</h1>
      
      <div className="updates-list">
        {updates.map(update => {
          const isExpanded = expandedItems[update.id];
          const preview = update.preview || getPreviewText(update.content);
          
          return (
            <div 
              key={update.id} 
              className={`update-item ${isExpanded ? 'expanded' : ''}`}
            >
              
              <div 
                className="update-question"
                onClick={() => toggleExpanded(update.id)}
              >
                <div className="update-question-content">
                  <span className="update-date">
                    {update.date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <h3>{update.subject}</h3>
                  {!isExpanded && (
                    <p className="update-preview">{preview}</p>
                  )}
                </div>
                <span className="update-icon">
                  {isExpanded ? '−' : '+'}
                </span>
              </div>
              
              <div className="update-answer">
                <p>{update.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpdatesPage;