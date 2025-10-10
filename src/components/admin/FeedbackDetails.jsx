import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFeedbackById, updateFeedbackStatus, addFeedbackNote, updateFeedbackPriority } from '../../services/firebase';
import './FeedbackDetails.css';

const FeedbackDetails = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [feedbackId]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const feedbackData = await getFeedbackById(feedbackId);

      if (!feedbackData) {
        setError('Feedback not found');
        return;
      }

      setFeedback({ id: feedbackId, ...feedbackData });
      setError('');
    } catch (err) {
      console.error('Error loading feedback:', err);
      setError('Failed to load feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateFeedbackStatus(feedbackId, newStatus);
      setFeedback(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      await updateFeedbackPriority(feedbackId, newPriority);
      setFeedback(prev => ({ ...prev, priority: newPriority }));
    } catch (err) {
      console.error('Error updating priority:', err);
      setError('Failed to update priority. Please try again.');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    try {
      setIsAddingNote(true);
      await addFeedbackNote(feedbackId, noteText);

      // Reload feedback to get updated notes
      await loadFeedback();
      setNoteText('');
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note. Please try again.');
    } finally {
      setIsAddingNote(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
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

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority-badge priority-high';
      case 'medium':
        return 'priority-badge priority-medium';
      case 'low':
        return 'priority-badge priority-low';
      default:
        return 'priority-badge';
    }
  };

  if (loading) {
    return (
      <div className="feedback-details">
        <div className="loading-message">Loading feedback...</div>
      </div>
    );
  }

  if (error && !feedback) {
    return (
      <div className="feedback-details">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/admin/feedback')} className="back-button">
          Back to Feedback List
        </button>
      </div>
    );
  }

  return (
    <div className="feedback-details">
      <div className="details-header">
        <button onClick={() => navigate('/admin/feedback')} className="back-button">
          ← Back to Feedback List
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {feedback && (
        <>
          <div className="details-card">
            <div className="details-card-header">
              <div className="header-left">
                <h1>Feedback Details</h1>
                <div className="badges">
                  <span className={getTypeBadgeClass(feedback.type)}>{feedback.type}</span>
                  <span className={getStatusBadgeClass(feedback.status)}>
                    {feedback.status === 'in-progress' ? 'In Progress' : feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                  </span>
                  {feedback.priority && (
                    <span className={getPriorityBadgeClass(feedback.priority)}>
                      {feedback.priority.charAt(0).toUpperCase() + feedback.priority.slice(1)} Priority
                    </span>
                  )}
                </div>
              </div>
              <div className="header-right">
                <span className="feedback-id">{feedback.id}</span>
                <span className="feedback-date">{formatDate(feedback.timestamp)}</span>
              </div>
            </div>

            <div className="details-section">
              <h3>Customer Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Name:</label>
                  <span>{feedback.name}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span><a href={`mailto:${feedback.email}`}>{feedback.email}</a></span>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>Feedback Content</h3>
              <div className="content-item">
                <label>Subject:</label>
                <p>{feedback.subject || 'No subject'}</p>
              </div>
              <div className="content-item">
                <label>Message:</label>
                <p className="feedback-message">{feedback.message}</p>
              </div>
            </div>

            <div className="details-section">
              <h3>Management</h3>
              <div className="management-controls">
                <div className="control-group">
                  <label htmlFor="status-select">Status:</label>
                  <select
                    id="status-select"
                    value={feedback.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="control-select"
                  >
                    <option value="new">New</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div className="control-group">
                  <label htmlFor="priority-select">Priority:</label>
                  <select
                    id="priority-select"
                    value={feedback.priority || 'medium'}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="control-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="notes-section">
            <h3>Internal Notes</h3>

            {feedback.adminNotes && feedback.adminNotes.length > 0 ? (
              <div className="notes-list">
                {feedback.adminNotes.map((noteItem, index) => (
                  <div key={index} className="note-item">
                    <div className="note-header">
                      <span className="note-date">{formatDate(noteItem.timestamp)}</span>
                    </div>
                    <div className="note-content">{noteItem.note}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-notes">No notes yet. Add a note below to track progress or important information.</p>
            )}

            <div className="add-note-section">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note..."
                className="note-textarea"
                rows="4"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || isAddingNote}
                className="add-note-button"
              >
                {isAddingNote ? 'Adding Note...' : 'Add Note'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FeedbackDetails;
