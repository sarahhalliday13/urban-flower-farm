import React, { useState, useEffect } from 'react';
import '../styles/AdminUpdates.css';
import { saveNewsItems, fetchNewsItems } from '../services/firebase';

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

  // Fetch news from Firebase
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const newsData = await fetchNewsItems();
        
        // Convert date strings to Date objects
        const processedData = newsData.map(item => ({
          ...item,
          date: new Date(item.date)
        }));
        
        setUpdates(processedData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading news:', error);
        setError('Failed to load news. Using demo data instead.');
        
        // Fallback to some default news if the fetch fails
        setUpdates([
          {
            id: 'news-1',
            subject: 'Buttons Flower Farm Online Shop Now Open!',
            content: 'Our catalog of 300+ plants is live and ready for your orders! Browse our seasonal collections, find detailed growing information, and enjoy hassle-free checkout with local pickup. Thank you for supporting our farm - happy planting!',
            date: new Date('2025-03-23')
          }
        ]);
        setLoading(false);
      }
    };

    // Add a slight delay for smoother UX
    const timer = setTimeout(() => {
      fetchNews();
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
    
    try {
      let updatedNews;
      
      if (editingId) {
        // Update existing update
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
      } else {
        // Create new update
        const newId = 'news-' + (Math.floor(Math.random() * 10000) + 1);
        const newUpdate = {
          id: newId,
          subject: subject.trim(),
          content: content.trim(),
          date: new Date()
        };
        
        updatedNews = [newUpdate, ...updates];
      }
      
      // Save to Firebase
      const result = await saveNewsItems(updatedNews);
      
      if (result.success) {
        setUpdates(updatedNews);
        
        setSuccessMessage(editingId 
          ? "Update successfully edited and saved!" 
          : "New update successfully added!");
        
        // Clear form
        setSubject('');
        setContent('');
        setEditingId(null);
      } else {
        throw new Error(result.error || 'Failed to save to Firebase');
      }
    } catch (error) {
      console.error("Error saving update:", error);
      setError("Failed to save update. Please try again: " + error.message);
    } finally {
      setSubmitting(false);
    }
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
    
    try {
      // Remove from state
      const updatedNews = updates.filter(update => update.id !== id);
      
      // Save to Firebase
      const result = await saveNewsItems(updatedNews);
      
      if (result.success) {
        setUpdates(updatedNews);
        
        setSuccessMessage("Update successfully deleted!");
        
        // If deleting the one being edited, reset form
        if (editingId === id) {
          setSubject('');
          setContent('');
          setEditingId(null);
        }
      } else {
        throw new Error(result.error || 'Failed to delete from Firebase');
      }
    } catch (error) {
      console.error("Error deleting update:", error);
      setError("Failed to delete update: " + error.message);
    }
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
                      <span role="img" aria-label="Edit">✏️</span>
                    </button>
                    <button 
                      className="delete-button" 
                      onClick={() => handleDelete(update.id)}
                      title="Delete"
                    >
                      <span role="img" aria-label="Delete">🗑️</span>
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