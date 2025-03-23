import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/WhatsNew.css';

// Static fallback news data in case localStorage is empty
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

// Helper to get updates from localStorage
const getUpdatesFromLocalStorage = () => {
  try {
    const storedUpdates = localStorage.getItem('newsUpdates');
    if (storedUpdates) {
      // Parse and convert date strings back to Date objects
      return JSON.parse(storedUpdates).map(update => ({
        ...update,
        date: new Date(update.date)
      }));
    }
  } catch (error) {
    console.error('Error reading news from localStorage:', error);
  }
  return null;
};

const WhatsNew = ({ maxDisplay = 1 }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  // Load news updates from localStorage or fallback to static data
  const loadNewsUpdates = () => {
    const storedUpdates = getUpdatesFromLocalStorage();
    if (storedUpdates && storedUpdates.length > 0) {
      setUpdates(storedUpdates);
    } else {
      setUpdates(fallbackNewsData);
    }
    setLoading(false);
  };

  // Initial load of updates
  useEffect(() => {
    // Simulate a brief loading period for smoother UI
    const timer = setTimeout(() => {
      loadNewsUpdates();
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Listen for news update events
  useEffect(() => {
    const handleNewsUpdated = () => {
      loadNewsUpdates();
    };
    
    window.addEventListener('newsUpdated', handleNewsUpdated);
    
    return () => {
      window.removeEventListener('newsUpdated', handleNewsUpdated);
    };
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
              <h3 className="update-subject">{update.subject}</h3>
              <span className="update-date">
                {update.date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="update-body">{update.content}</div>
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