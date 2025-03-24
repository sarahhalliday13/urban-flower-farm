import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Contact.css';

function Contact() {
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  });
  
  const [formStatus, setFormStatus] = useState({
    submitted: false,
    error: null
  });
  
  // Load saved customer data
  useEffect(() => {
    const customerData = localStorage.getItem('customerData');
    if (customerData) {
      try {
        const parsedCustomerData = JSON.parse(customerData);
        setFormData(prev => ({
          ...prev,
          firstName: parsedCustomerData.firstName || prev.firstName,
          lastName: parsedCustomerData.lastName || prev.lastName,
          email: parsedCustomerData.email || prev.email,
          phone: parsedCustomerData.phone || prev.phone
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      setFormStatus({
        submitted: false,
        error: 'Please fill out all required fields'
      });
      return;
    }
    
    // Save customer data
    try {
      localStorage.setItem('customerData', JSON.stringify(formData));
    } catch (error) {
      console.error('Error saving customer data:', error);
    }
    
    // Create mailto link with form data
    const subject = encodeURIComponent('Flower Pick Up Request');
    const body = encodeURIComponent(
      `Name: ${formData.firstName} ${formData.lastName}\n` +
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
        <h1>Contact</h1>
        
        <div className="contact-form-container">
          <h2>Contact Information</h2>
          
          <form onSubmit={handleSubmit} className="contact-form">
            {formStatus.error && (
              <div className="error-message">{formStatus.error}</div>
            )}
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <h2>Flower Pick Up</h2>
            
            <div className="form-group">
              <label>Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="4"
                placeholder="Let us know when you'd like to pick up your flowers..."
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-button">
                Send Message
              </button>
            </div>
          </form>
          
          {formStatus.submitted && (
            <div className="success-message">
              <p>Thank you for your message! We'll get back to you soon.</p>
              <button 
                onClick={() => {
                  setFormStatus({ submitted: false, error: null });
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    message: ''
                  });
                }}
                className="send-another-btn"
              >
                Send Another Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Contact; 