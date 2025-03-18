import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
    error: null
  });
  
  // Check for subject in URL parameters and load saved form data from localStorage
  useEffect(() => {
    // Load saved form data from localStorage
    const savedFormData = localStorage.getItem('contactFormData');
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData);
      setFormData(prev => ({
        ...prev,
        name: parsedData.name || '',
        email: parsedData.email || '',
        phone: parsedData.phone || '',
        // Don't restore the subject and message from localStorage by default
      }));
    }
    
    // Check for subject in URL parameters (URL params override localStorage)
    const queryParams = new URLSearchParams(location.search);
    const subjectParam = queryParams.get('subject');
    
    if (subjectParam) {
      setFormData(prev => ({
        ...prev,
        subject: decodeURIComponent(subjectParam)
      }));
    }
    
    // Handle scrolling behavior on mount - this runs only once when the component loads
    // If this is a direct navigation to the map section without "Schedule a Visit"
    if (location.hash === '#map-section' && !location.search.includes('Schedule')) {
      // Allow the default browser behavior to scroll to the map section
      // Browser will automatically scroll to the element with id="map-section"
    } else {
      // For any other case (including Schedule a Visit), prevent auto-scrolling
      // by forcing scroll to top
      window.scrollTo(0, 0);
    }
  }, [location.search, location.hash]);

  // Function to handle scrolling to map
  const scrollToMap = (e) => {
    e.preventDefault();
    const mapSection = document.getElementById('map-section');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.name || !formData.email || !formData.message) {
      setFormStatus({
        submitted: false,
        error: 'Please fill out all required fields'
      });
      return;
    }
    
    // Save form data to localStorage (excluding message)
    localStorage.setItem('contactFormData', JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone
    }));
    
    // Create mailto link with form data
    const subject = encodeURIComponent(formData.subject || 'Message from website');
    const body = encodeURIComponent(
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Phone: ${formData.phone}\n\n` +
      `Message: ${formData.message}`
    );
    
    // Open default email client with pre-filled info
    window.location.href = `mailto:Buttonsflowerfarm@gmail.com?subject=${subject}&body=${body}`;
    
    // Show success message
    setFormStatus({
      submitted: true,
      error: null
    });
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  const handleCopyEmail = (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const svgElement = btn.querySelector('svg');
    const textElement = btn.querySelector('.copy-text');
    
    // Hide SVG, show "Copied" text
    if (svgElement) svgElement.style.display = 'none';
    if (textElement) textElement.style.display = 'inline';
    
    navigator.clipboard.writeText('Buttonsflowerfarm@gmail.com')
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
              <div className="info-icon">📍</div>
              <div className="info-text">
                <h3>Location</h3>
                <p>349 9th Street East, North Vancouver, BC V7L2B1</p>
                <button onClick={scrollToMap} className="map-link">Get a map</button>
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-icon">📧</div>
              <div className="info-text">
                <h3>Email</h3>
                <div className="email-container">
                  <p className="email-with-copy">
                    <a href="mailto:Buttonsflowerfarm@gmail.com">Buttonsflowerfarm@gmail.com</a>
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
              <div className="info-icon">🕓</div>
              <div className="info-text">
                <h3>Hours</h3>
                <p>By appointment only</p>
              </div>
            </div>
          </div>

          <div className="contact-form-container">
            <h2>Send Us a Message</h2>
            {formStatus.submitted ? (
              <div className="success-message">
                <p>Thank you for your message! We'll get back to you soon.</p>
                <button 
                  className="send-another-btn"
                  onClick={() => setFormStatus({ submitted: false, error: null })}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                {formStatus.error && (
                  <div className="error-message">{formStatus.error}</div>
                )}
                
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
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
                  <label htmlFor="email">Email *</label>
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
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    value={formData.message}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
                
                <button type="submit" className="submit-button">Send Message</button>
              </form>
            )}
          </div>
        </div>
      </div>
      
      <div id="map-section" className="map-section">
        <h2>Visit Our Farm</h2>
        <p>We're located in North Vancouver - please contact us for specific directions and to schedule a visit.</p>
        <div className="map-container">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2601.3089291400557!2d-123.07396922355863!3d49.32470257139288!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5486708a4d526125%3A0xe8177a66d51d9a9a!2s349%20E%209th%20St%2C%20North%20Vancouver%2C%20BC%20V7L%202B1%2C%20Canada!5e0!3m2!1sen!2sus!4v1717380333665!5m2!1sen!2sus" 
            width="100%" 
            height="450" 
            style={{ border: 0 }}
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="349 9th Street East, North Vancouver, BC V7L2B1"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

export default Contact; 