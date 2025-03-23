import React, { useState, useEffect } from 'react';
import '../styles/UpdatesPage.css';

// Static fallback news data if localStorage is empty
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
  },
  {
    id: 'news-4',
    subject: 'Fall Bulb Pre-Orders',
    content: 'Our fall bulbs are now available for pre-order! Get your spring-blooming tulips, daffodils, and more ordered now before they sell out.',
    date: new Date('2024-09-15')
  },
  {
    id: 'news-5',
    subject: 'Summer Garden Tour',
    content: 'Join us for our annual summer garden tour happening next month. See our growing techniques and get tips for your own garden.',
    date: new Date('2024-06-10')
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

const UpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

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
    // Simulate loading state for a smoother UX
    const timer = setTimeout(() => {
      loadNewsUpdates();
    }, 300);

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

  if (loading) {
    return (
      <div className="updates-page-container">
        <h1>News</h1>
        <div className="updates-loading">Loading updates...</div>
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
      <p className="updates-intro">
        Stay up to date with the latest news, plant arrivals, seasonal offerings, and more from Buttons Flower Farm.
      </p>
      
      {updates.length === 0 ? (
        <div className="no-updates">No news available at this time.</div>
      ) : (
        <div className="updates-content">
          {sortedYears.map(year => (
            <div key={year} className="year-section">
              <div className="year-marker">
                <div className="year-circle"></div>
                <span className="year-label">{year}</span>
              </div>
              <div className="news-items">
                {updatesByYear[year].map(update => (
                  <div key={update.id} className="news-item">
                    <div className="news-item-date">
                      {update.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <h3 className="news-item-title">{update.subject}</h3>
                    <div className="news-item-content">{update.content}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpdatesPage; 