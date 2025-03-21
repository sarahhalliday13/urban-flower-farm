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
    message: 'I want to come and see all your beautiful flowers!'
  });
  
  const [formStatus, setFormStatus] = useState({
    submitted: false,
    error: null
  });
  
  // Handle scrolling behavior on mount - this runs only once when the component loads
  // If this is a direct navigation to the map section without "Schedule a Visit"
  useEffect(() => {
    // First check if there's dedicated customer data
    const customerData = localStorage.getItem('customerData');
    if (customerData) {
      try {
        const parsedCustomerData = JSON.parse(customerData);
        setFormData(prev => ({
          ...prev,
          name: parsedCustomerData.name || prev.name,
          email: parsedCustomerData.email || prev.email,
          phone: parsedCustomerData.phone || prev.phone,
          // Keep existing message and subject
          message: prev.message,
          subject: prev.subject
        }));
      } catch (error) {
        console.error('Error parsing customer data:', error);
      }
    }
    
    // Then check if user has placed an order previously and has customer info
    else {
      const lastOrder = localStorage.getItem('lastOrder');
      if (lastOrder) {
        try {
          const orderData = JSON.parse(lastOrder);
          // If order contains customer data, use it to prepopulate form
          if (orderData.customer) {
            setFormData(prev => ({
              ...prev,
              name: orderData.customer.name || prev.name,
              email: orderData.customer.email || prev.email,
              phone: orderData.customer.phone || prev.phone,
              // Keep existing message and subject
              message: prev.message,
              subject: prev.subject
            }));
          }
        } catch (error) {
          console.error('Error parsing last order data:', error);
        }
      }
    }
    
    // Then check saved contact form data from localStorage (lowest priority)
    const savedFormData = localStorage.getItem('contactFormData');
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData);
      setFormData(prev => ({
        ...prev,
        name: prev.name || parsedData.name || '',
        email: prev.email || parsedData.email || '',
        phone: prev.phone || parsedData.phone || '',
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
    
    // Handle scrolling behavior on mount
    window.scrollTo(0, 0);
  }, [location.search, location.hash]);

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
    
    // Save customer data in a format consistent with order data
    try {
      // First check if there's already customer data
      const existingCustomerData = localStorage.getItem('customerData');
      const customerData = existingCustomerData ? JSON.parse(existingCustomerData) : {};
      
      // Update with latest information
      customerData.name = formData.name;
      customerData.email = formData.email;
      customerData.phone = formData.phone;
      
      // Save back to localStorage
      localStorage.setItem('customerData', JSON.stringify(customerData));
    } catch (error) {
      console.error('Error saving customer data:', error);
    }
    
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
                <p>Central Lonsdale Area<br />North Vancouver, BC</p>
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
            
            <div className="info-item">
              <div className="info-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M20.625 2.625H3.375C2.96016 2.625 2.625 2.96016 2.625 3.375V20.625C2.625 21.0398 2.96016 21.375 3.375 21.375H12.8672V14.1992H10.2891V11.1328H12.8672V8.85938C12.8672 6.24609 14.4141 4.88672 16.7578 4.88672C17.8828 4.88672 18.8438 4.97344 19.1367 5.01328V7.78359H17.4961C16.2188 7.78359 15.9492 8.38828 15.9492 9.27422V11.1328H19.0312L18.6211 14.1992H15.9492V21.375H20.625C21.0398 21.375 21.375 21.0398 21.375 20.625V3.375C21.375 2.96016 21.0398 2.625 20.625 2.625Z"/>
                </svg>
              </div>
              <div className="info-text">
                <h3>The Socials</h3>
                <div className="social-icons">
                  <a 
                    href="https://www.facebook.com/share/g/1Dn9gPpobA/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="social-icon facebook-icon"
                    title="Follow us on Facebook"
                  >
                    Buttons Urban Flower Farm
                  </a>
                </div>
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
    </div>
  );
}

export default Contact; 