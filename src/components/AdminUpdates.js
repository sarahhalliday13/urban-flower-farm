import React, { useState, useEffect } from 'react';
import '../styles/AdminUpdates.css';

// Static initial news data that matches our other components
const initialUpdates = [
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

// Helper to save updates to localStorage
const saveUpdatesToLocalStorage = (updates) => {
  // Convert dates to strings for storage
  const updatesForStorage = updates.map(update => ({
    ...update,
    date: update.date.toISOString()
  }));
  localStorage.setItem('newsUpdates', JSON.stringify(updatesForStorage));
  
  // Dispatch an event so other components can react
  window.dispatchEvent(new Event('newsUpdated'));
};

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

const AdminUpdates = () => {
  const [updates, setUpdates] = useState([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load initial updates from localStorage or fallback to initialUpdates
  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      const storedUpdates = getUpdatesFromLocalStorage();
      
      if (storedUpdates) {
        setUpdates(storedUpdates);
      } else {
        setUpdates(initialUpdates);
        // Initialize localStorage with default data
        saveUpdatesToLocalStorage(initialUpdates);
      }
      
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !content.trim()) {
      setError("Subject and content are required.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    // Simulate network delay
    setTimeout(() => {
      try {
        let updatedNews;
        
        if (editingId) {
          // Update existing update in local state
          updatedNews = updates.map(update => 
            update.id === editingId 
              ? { 
                  ...update, 
                  subject: subject.trim(), 
                  content: content.trim(),
                  updatedAt: new Date()
                } 
              : update
          );
          
          setUpdates(updatedNews);
          setSuccessMessage("Update successfully edited!");
          setEditingId(null);
        } else {
          // Create new update in local state
          const newId = 'news-' + (Math.floor(Math.random() * 10000) + 1);
          const newUpdate = {
            id: newId,
            subject: subject.trim(),
            content: content.trim(),
            date: new Date(),
            createdAt: new Date()
          };
          
          updatedNews = [newUpdate, ...updates];
          setUpdates(updatedNews);
          setSuccessMessage("New update successfully added!");
        }
        
        // Save to localStorage
        saveUpdatesToLocalStorage(updatedNews);
        
        // Clear form
        setSubject('');
        setContent('');
      } catch (error) {
        console.error("Error saving update:", error);
        setError("Failed to save update. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }, 500);
  };

  const handleEdit = (update) => {
    setSubject(update.subject);
    setContent(update.content);
    setEditingId(update.id);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this update? This action cannot be undone.")) {
      return;
    }
    
    // Simulate network delay
    setTimeout(() => {
      try {
        // Remove from local state
        const updatedNews = updates.filter(update => update.id !== id);
        setUpdates(updatedNews);
        
        // Save to localStorage
        saveUpdatesToLocalStorage(updatedNews);
        
        setSuccessMessage("Update successfully deleted!");
        
        // If deleting the one being edited, reset form
        if (editingId === id) {
          setSubject('');
          setContent('');
          setEditingId(null);
        }
      } catch (error) {
        console.error("Error deleting update:", error);
        setError("Failed to delete update. Please try again.");
      }
    }, 500);
  };

  const cancelEdit = () => {
    setSubject('');
    setContent('');
    setEditingId(null);
    setError(null);
  };

  return (
    <div className="admin-updates-container">
      <h2>Manage News</h2>
      <p className="updates-intro">
        Create and manage news items that will be displayed to customers on the website.
        These news items appear in the "News" section on the homepage and in the News page.
      </p>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="update-form-container">
        <h3>{editingId ? 'Edit News Item' : 'Create New News Item'}</h3>
        <form onSubmit={handleSubmit} className="update-form">
          <div className="form-group">
            <label htmlFor="subject">Subject:</label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
              disabled={submitting}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="content">Content:</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter update content"
              rows={5}
              disabled={submitting}
              required
            />
          </div>
          
          <div className="form-actions">
            {editingId && (
              <button 
                type="button" 
                className="cancel-button" 
                onClick={cancelEdit}
                disabled={submitting}
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="save-button" 
              disabled={submitting}
            >
              {submitting 
                ? (editingId ? 'Saving...' : 'Creating...') 
                : (editingId ? 'Save Changes' : 'Create Update')}
            </button>
          </div>
        </form>
      </div>
      
      <div className="updates-list">
        <h3>Existing News Items</h3>
        {loading ? (
          <p>Loading updates...</p>
        ) : updates.length === 0 ? (
          <p>No updates have been created yet.</p>
        ) : (
          <div className="updates-grid">
            {updates.map(update => (
              <div key={update.id} className="update-item">
                <div className="update-item-header">
                  <span className="update-date">
                    {update.date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <div className="update-actions">
                    <button 
                      className="edit-button" 
                      onClick={() => handleEdit(update)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-button" 
                      onClick={() => handleDelete(update.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <h4 className="update-subject">{update.subject}</h4>
                <p className="update-content">{update.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUpdates; 