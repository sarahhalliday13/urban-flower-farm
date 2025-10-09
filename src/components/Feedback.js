import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Feedback.css';

function Feedback() {
  const navigate = useNavigate();
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

      // Reset form
      setFormData({
        name: '',
        email: '',
        type: 'General Feedback',
        subject: '',
        message: ''
      });
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

  return (
    <div className="feedback-section">
      <div className="feedback-hero">
        <h1>We'd Love to Hear Your Feedback!</h1>
        <p className="beta-badge">Currently in Beta - Your feedback helps us improve</p>
      </div>

      <div className="feedback-content">
        {formStatus.submitted ? (
          <div className="feedback-success">
            <div className="success-icon">✓</div>
            <h2>Thank You!</h2>
            <p>{formStatus.message || "Your feedback has been received. We truly appreciate you taking the time to help us improve!"}</p>
            <p className="feedback-note">
              We review all feedback carefully and use it to make this site better for everyone.
            </p>
            <button
              className="submit-another-btn"
              onClick={() => navigate(-1)}
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="feedback-form-container">
            <div className="feedback-intro">
              <p>Whether you've found a bug, have a feature request, or just want to share your thoughts, we're all ears! Your input is invaluable in shaping this platform.</p>
            </div>

            <form className="feedback-form" onSubmit={handleSubmit}>
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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email <span className="required">*</span></label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="type">Feedback Type <span className="required">*</span></label>
                  <select
                    id="type"
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
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief description (optional)"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">Your Feedback <span className="required">*</span></label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="6"
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
          </div>
        )}
      </div>
    </div>
  );
}

export default Feedback;
