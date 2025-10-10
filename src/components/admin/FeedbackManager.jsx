import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFeedback, updateFeedbackStatus } from '../../services/firebase';
import './FeedbackManager.css';

const FeedbackManager = () => {
  const [feedback, setFeedback] = useState([]);
  const [filteredFeedback, setFilteredFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadFeedback();
  }, []);

  useEffect(() => {
    filterFeedback();
  }, [feedback, statusFilter, typeFilter, searchTerm]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const feedbackData = await getFeedback();

      // Convert object to array and sort by timestamp (newest first)
      const feedbackArray = Object.entries(feedbackData || {}).map(([id, data]) => ({
        id,
        ...data
      }));

      feedbackArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setFeedback(feedbackArray);
      setError('');
    } catch (err) {
      console.error('Error loading feedback:', err);
      setError('Failed to load feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterFeedback = () => {
    let filtered = [...feedback];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(searchLower) ||
        item.email?.toLowerCase().includes(searchLower) ||
        item.subject?.toLowerCase().includes(searchLower) ||
        item.message?.toLowerCase().includes(searchLower) ||
        item.id?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredFeedback(filtered);
  };

  const handleStatusChange = async (feedbackId, newStatus) => {
    try {
      await updateFeedbackStatus(feedbackId, newStatus);

      // Update local state
      setFeedback(prev => prev.map(item =>
        item.id === feedbackId ? { ...item, status: newStatus } : item
      ));
    } catch (err) {
      console.error('Error updating feedback status:', err);
      setError('Failed to update status. Please try again.');
    }
  };

  const handleViewDetails = (feedbackId) => {
    navigate(`/admin/feedback/${feedbackId}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'new':
        return 'status-badge status-new';
      case 'in-progress':
        return 'status-badge status-in-progress';
      case 'resolved':
        return 'status-badge status-resolved';
      default:
        return 'status-badge';
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'Bug Report':
        return 'type-badge type-bug';
      case 'Feature Request':
        return 'type-badge type-feature';
      case 'General Feedback':
        return 'type-badge type-general';
      default:
        return 'type-badge';
    }
  };

  const getStatusCounts = () => {
    return {
      all: feedback.length,
      new: feedback.filter(f => f.status === 'new').length,
      'in-progress': feedback.filter(f => f.status === 'in-progress').length,
      resolved: feedback.filter(f => f.status === 'resolved').length
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="feedback-manager">
        <div className="loading-message">Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className="feedback-manager">
      <div className="feedback-header">
        <h1>Customer Feedback</h1>
        <div className="feedback-stats">
          <div className="stat-card">
            <span className="stat-number">{statusCounts.all}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{statusCounts.new}</span>
            <span className="stat-label">New</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{statusCounts['in-progress']}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{statusCounts.resolved}</span>
            <span className="stat-label">Resolved</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="feedback-filters">
        <div className="filter-group">
          <label htmlFor="search">Search:</label>
          <input
            id="search"
            type="text"
            placeholder="Search by name, email, subject, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="type-filter">Type:</label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="Bug Report">Bug Report</option>
            <option value="Feature Request">Feature Request</option>
            <option value="General Feedback">General Feedback</option>
          </select>
        </div>
      </div>

      {filteredFeedback.length === 0 ? (
        <div className="no-feedback">
          {feedback.length === 0 ? (
            <>
              <p>No feedback submissions yet.</p>
              <p className="hint">Customer feedback will appear here when submitted through the feedback panel.</p>
            </>
          ) : (
            <p>No feedback matches your current filters.</p>
          )}
        </div>
      ) : (
        <div className="feedback-list">
          {filteredFeedback.map(item => (
            <div key={item.id} className="feedback-card">
              <div className="feedback-card-header">
                <div className="feedback-meta">
                  <span className="feedback-id">{item.id}</span>
                  <span className={getTypeBadgeClass(item.type)}>{item.type}</span>
                  <span className={getStatusBadgeClass(item.status)}>
                    {item.status === 'in-progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
                <span className="feedback-date">{formatDate(item.timestamp)}</span>
              </div>

              <div className="feedback-card-body">
                <div className="feedback-subject">
                  <strong>{item.subject || 'No subject'}</strong>
                </div>
                <div className="feedback-customer">
                  <span>{item.name}</span>
                  <span className="separator">•</span>
                  <span>{item.email}</span>
                </div>
                <div className="feedback-message-preview">
                  {item.message?.substring(0, 150)}
                  {item.message?.length > 150 ? '...' : ''}
                </div>
              </div>

              <div className="feedback-card-actions">
                <select
                  value={item.status}
                  onChange={(e) => handleStatusChange(item.id, e.target.value)}
                  className="status-select"
                >
                  <option value="new">New</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button
                  onClick={() => handleViewDetails(item.id)}
                  className="view-button"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackManager;
