import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/WhatsNew.css';
import { fetchNewsItems } from '../services/firebase';

// Static fallback news data in case Firebase fetch fails
const fallbackNewsData = [
  {
    id: 'news-1',
    subject: 'Welcome to Buttons Flower Farm',
    content: 'This is where you\'ll find the latest news, plant arrivals, and seasonal offerings. Check back soon for updates!',
    date: new Date('2025-03-23')
  },
  {
    id: 'news-2',
    subject: 'Spring Growing Season Beginning',
    content: 'We\'re preparing our garden beds for the spring growing season. Expect lots of new plants to be available soon!',
    date: new Date('2025-02-21')
  },
  {
    id: 'news-3',
    subject: 'Winter Workshop Success',
    content: 'Thank you to everyone who attended our winter gardening workshop. We had a great turnout and lots of fun learning together!',
    date: new Date('2024-12-23')
  }
];

const WhatsNew = ({ maxDisplay = 1 }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [expandedItems, setExpandedItems] = useState(new Set());

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
        
        // If we got data from Firebase, process it
        if (newsData && newsData.length > 0) {
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
        } else {
          // If no data in Firebase, use fallback data
          console.log('No news data found in Firebase, using fallback data');
          setUpdates(fallbackNewsData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading news from Firebase:', error);
        // Use fallback data if Firebase fails
        setUpdates(fallbackNewsData);
        setLoading(false);
      }
    };

    // Add a slight delay for smoother UX
    const timer = setTimeout(() => {
      fetchNews();
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    
    // Save the close timestamp with a 20-minute expiration
    const expirationTime = Date.now() + (20 * 60 * 1000); // 20 minutes in milliseconds
    localStorage.setItem('newsHiddenUntil', expirationTime.toString());
  };

  // Check if we should hide the news based on the expiration time
  useEffect(() => {
    const checkExpiration = () => {
      const hiddenUntil = localStorage.getItem('newsHiddenUntil');
      
      if (hiddenUntil) {
        const expirationTime = parseInt(hiddenUntil, 10);
        const now = Date.now();
        
        if (now < expirationTime) {
          // Still within the hidden period
          setIsVisible(false);
        } else {
          // Expired, remove the item and show the news
          localStorage.removeItem('newsHiddenUntil');
          setIsVisible(true);
        }
      }
    };
    
    // Check on component mount
    checkExpiration();
    
    // Also set up a timer to check periodically
    const intervalId = setInterval(checkExpiration, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, []);

  const toggleExpanded = (id) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading || !isVisible || updates.length === 0) {
    return null;
  }

  const visibleUpdates = updates.slice(0, maxDisplay);

  return (
    <div className="whats-new-container">
      <button className="close-news-button" onClick={handleClose} aria-label="Close news">
        ×
      </button>
      <div className="whats-new-content">
        {visibleUpdates.map((update) => (
          <div key={update.id} className="update-item">
            <div className="update-header">
              <h3 className="update-subject">
                {update.subject}
              </h3>
              <span className="update-date">
                {update.date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="update-body">
              {expandedItems.has(update.id) ? (
                <>
                  {update.content}
                  <button 
                    className="read-more-link inline-button" 
                    onClick={() => toggleExpanded(update.id)}
                  >
                    Read less
                  </button>
                </>
              ) : (
                <>
                  {getPreviewText(update.content, update.isPinned ? 200 : 150)}
                  {((update.isPinned && update.content.length > 200) || (!update.isPinned && update.content.length > 150)) && (
                    <button 
                      className="read-more-link inline-button" 
                      onClick={() => toggleExpanded(update.id)}
                    >
                      Read more
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="news-footer">
              <Link to="/updates" className="view-all-news">View All News</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhatsNew; 