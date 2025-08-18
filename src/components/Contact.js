import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { sendContactFormEmail } from '../services/emailService';
import './Contact.css';

function Contact() {
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  
  const [formStatus, setFormStatus] = useState({
    submitted: false,
    error: null,
    message: null
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load saved customer data
  useEffect(() => {
    const customerData = localStorage.getItem('customerData');
    if (customerData) {
      try {
        const parsedCustomerData = JSON.parse(customerData);
        setFormData(prev => ({
          ...prev,
          name: parsedCustomerData.firstName + ' ' + parsedCustomerData.lastName || prev.name,
          email: parsedCustomerData.email || prev.email,
          phone: parsedCustomerData.phone || prev.phone
        }));
      } catch (error) {
        console.error('Error parsing customer data:', error);
      }
    }
    
    // Check for subject in URL parameters
    const queryParams = new URLSearchParams(location.search);
    const subjectParam = queryParams.get('subject');
    
    if (subjectParam) {
      setFormData(prev => ({
        ...prev,
        subject: decodeURIComponent(subjectParam)
      }));
    }
  }, [location.search]);

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
      message: 'Sending message...'
    });
    
    // Save customer data
    try {
      const [firstName, ...lastNameParts] = formData.name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      localStorage.setItem('customerData', JSON.stringify({
        firstName,
        lastName,
        email: formData.email,
        phone: formData.phone
      }));
    } catch (error) {
      console.error('Error saving customer data:', error);
    }

    try {
      // Send the form data
      const result = await sendContactFormEmail(formData);
      
      if (result.success) {
        // Show success message
        setFormStatus({
          submitted: true,
          error: null,
          message: result.message || 'Message sent successfully'
        });
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        });
      } else {
        // Handle error from the email service
        throw new Error(result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setFormStatus({
        submitted: false,
        error: error.message || 'Failed to send message. Please try again.',
        message: null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyEmail = (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const svgElement = btn.querySelector('svg');
    const textElement = btn.querySelector('.copy-text');
    
    // Hide SVG, show "Copied" text
    if (svgElement) svgElement.style.display = 'none';
    if (textElement) textElement.style.display = 'inline';
    
    navigator.clipboard.writeText('buttonsflowerfarm@telus.net')
      .then(() => {
        // Show tooltip
        btn.classList.add('copied');
        
        // Reset button after 2 seconds
        setTimeout(() => {
          btn.classList.remove('copied');
          if (svgElement) svgElement.style.display = 'inline';
          if (textElement) textElement.style.display = 'none';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy email: ', err);
      });
  };

  return (
    <div className="contact-section">
      <div className="contact-content">
        <div className="contact-grid">
          <div className="contact-info">
            <h2>Find Us</h2>
            <div className="info-item">
              <div className="info-icon">
                <span role="img" aria-label="Location">📍</span>
              </div>
              <div className="info-text">
                <h3>Location</h3>
                <p>Central Lonsdale Area<br />North Vancouver, BC</p>
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-icon">
                <span role="img" aria-label="Email">📧</span>
              </div>
              <div className="info-text">
                <h3>Email</h3>
                <div className="email-container">
                  <p className="email-with-copy">
                    <a href="mailto:buttonsflowerfarm@telus.net">buttonsflowerfarm@telus.net</a>
                    <button 
                      className="copy-email-btn" 
                      onClick={handleCopyEmail}
                      title="Copy email address"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span className="copy-text">Copied</span>
                      <span className="copy-tooltip">Copied!</span>
                    </button>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-icon">
                <span role="img" aria-label="Clock">🕓</span>
              </div>
              <div className="info-text">
                <h3>Hours</h3>
                <p>By appointment only</p>
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-icon">
                <span role="img" aria-label="Social Media">🌐</span>
              </div>
              <div className="info-text">
                <h3>The Socials</h3>
                <div className="social-icons">
                  <a href="https://www.facebook.com/buttonsurbanflowerfarm" target="_blank" rel="noopener noreferrer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M20.625 2.625H3.375C2.96016 2.625 2.625 2.96016 2.625 3.375V20.625C2.625 21.0398 2.96016 21.375 3.375 21.375H12.8672V14.1992H10.2891V11.1328H12.8672V8.85938C12.8672 6.24609 14.4141 4.88672 16.7578 4.88672C17.8828 4.88672 18.8438 4.97344 19.1367 5.01328V7.78359H17.4961C16.2188 7.78359 15.9492 8.38828 15.9492 9.27422V11.1328H19.0312L18.6211 14.1992H15.9492V21.375H20.625C21.0398 21.375 21.375 21.0398 21.375 20.625V3.375C21.375 2.96016 21.0398 2.625 20.625 2.625Z"/>
                    </svg>
                    Facebook
                  </a>
                  <a href="https://www.instagram.com/buttonsurbanflowerfarm/" target="_blank" rel="noopener noreferrer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#E4405F">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                    </svg>
                    Instagram
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="contact-form-container">
            <h2>Send Us a Message</h2>
            
            {formStatus.submitted ? (
              <div className="form-success">
                <h3>Thank You!</h3>
                <p>{formStatus.message || "Your message has been sent successfully. We'll get back to you soon!"}</p>
                <p className="spam-notice">
                  <strong>Please check your spam folder if you don't see our reply.</strong>
                </p>
                <button className="send-again-btn" onClick={() => setFormStatus({ submitted: false, error: null, message: null })}>
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                {formStatus.error && (
                  <div className="form-error">
                    {formStatus.error}
                  </div>
                )}
                
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
                
                <div className="form-group">
                  <label htmlFor="phone">Phone (optional)</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input 
                    type="text" 
                    id="subject" 
                    name="subject" 
                    value={formData.subject} 
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Message <span className="required">*</span></label>
                  <textarea 
                    id="message" 
                    name="message" 
                    value={formData.message} 
                    onChange={handleChange} 
                    rows="5" 
                    required
                  ></textarea>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact; 