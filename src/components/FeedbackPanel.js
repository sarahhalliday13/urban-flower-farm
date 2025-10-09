import React, { useState, useEffect } from 'react';
import './FeedbackPanel.css';

function FeedbackPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: 'General Feedback',
    subject: '',
    message: ''
  });

  const [formStatus, setFormStatus] = useState({
    submitted: false,
    error: null,
    message: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load saved customer data on component mount
  useEffect(() => {
    const customerData = localStorage.getItem('customerData');
    if (customerData) {
      try {
        const parsedCustomerData = JSON.parse(customerData);
        setFormData(prev => ({
          ...prev,
          name: parsedCustomerData.firstName + ' ' + parsedCustomerData.lastName || prev.name,
          email: parsedCustomerData.email || prev.email
        }));
      } catch (error) {
        console.error('Error parsing customer data:', error);
      }
    }
  }, []);

  // Close panel on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Simple validation
    if (!formData.name || !formData.email || !formData.message) {
      setFormStatus({
        submitted: false,
        error: 'Please fill out all required fields',
        message: null
      });
      return;
    }

    setIsSubmitting(true);
    setFormStatus({
      submitted: false,
      error: null,
      message: 'Sending feedback...'
    });

    // Save customer data to localStorage for future use
    try {
      const [firstName, ...lastNameParts] = formData.name.split(' ');
      const lastName = lastNameParts.join(' ');

      localStorage.setItem('customerData', JSON.stringify({
        firstName,
        lastName,
        email: formData.email
      }));
    } catch (error) {
      console.error('Error saving customer data:', error);
    }

    try {
      // Import the Firebase function
      const { saveFeedback } = await import('../services/firebase');

      // Prepare feedback data
      const feedbackData = {
        name: formData.name,
        email: formData.email,
        type: formData.type,
        subject: formData.subject || 'No subject',
        message: formData.message,
        timestamp: new Date().toISOString(),
        status: 'new'
      };

      // Save to Firebase
      await saveFeedback(feedbackData);

      // Show success message
      setFormStatus({
        submitted: true,
        error: null,
        message: 'Thank you for your feedback!'
      });

      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          type: 'General Feedback',
          subject: '',
          message: ''
        });
        setFormStatus({
          submitted: false,
          error: null,
          message: null
        });
        setIsOpen(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setFormStatus({
        submitted: false,
        error: error.message || 'Failed to submit feedback. Please try again.',
        message: null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <>
      {/* Desktop Tab */}
      {!isOpen && (
        <button
          className="feedback-tab desktop-only"
          onClick={() => setIsOpen(true)}
          aria-label="Open feedback form"
        >
          Submit Feedback
        </button>
      )}

      {/* Mobile FAB */}
      {!isOpen && (
        <button
          className="feedback-fab mobile-only"
          onClick={() => setIsOpen(true)}
          aria-label="Open feedback form"
        >
          <span className="feedback-icon">📣</span>
        </button>
      )}

      {/* Overlay */}
      {isOpen && (
        <div className="feedback-overlay" onClick={handleOverlayClick}>
          {/* Slide-out Panel */}
          <div className={`feedback-panel ${isOpen ? 'open' : ''}`}>
            <div className="feedback-panel-header">
              <h2>We'd Love Your Feedback!</h2>
              <button
                className="feedback-close-btn"
                onClick={handleClose}
                aria-label="Close feedback form"
              >
                ×
              </button>
            </div>

            <div className="feedback-panel-content">
              {formStatus.submitted ? (
                <div className="feedback-success-panel">
                  <div className="success-icon">✓</div>
                  <h3>Thank You!</h3>
                  <p>{formStatus.message || "Your feedback has been received. We truly appreciate you taking the time to help us improve!"}</p>
                  <p className="feedback-note">
                    We review all feedback carefully and use it to make this site better for everyone.
                  </p>
                </div>
              ) : (
                <>
                  <div className="feedback-panel-intro">
                    <span className="beta-badge-small">Currently in Beta</span>
                    <p>Whether you've found a bug, have a feature request, or just want to share your thoughts, we're all ears!</p>
                  </div>

                  <form className="feedback-panel-form" onSubmit={handleSubmit}>
                    {formStatus.error && (
                      <div className="form-error">
                        {formStatus.error}
                      </div>
                    )}

                    {formStatus.message && !formStatus.error && (
                      <div className="form-info">
                        {formStatus.message}
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="panel-name">Name <span className="required">*</span></label>
                      <input
                        type="text"
                        id="panel-name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="panel-email">Email <span className="required">*</span></label>
                      <input
                        type="email"
                        id="panel-email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="panel-type">Feedback Type <span className="required">*</span></label>
                      <select
                        id="panel-type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        required
                      >
                        <option value="General Feedback">General Feedback</option>
                        <option value="Bug Report">Bug Report</option>
                        <option value="Feature Request">Feature Request</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="panel-subject">Subject</label>
                      <input
                        type="text"
                        id="panel-subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief description (optional)"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="panel-message">Your Feedback <span className="required">*</span></label>
                      <textarea
                        id="panel-message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows="5"
                        required
                        placeholder="Tell us what's on your mind..."
                      ></textarea>
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="submit-btn"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackPanel;
