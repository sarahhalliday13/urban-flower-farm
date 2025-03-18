import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';

function About() {
  return (
    <div className="about-section">
      <div className="about-content">
        <div className="about-grid">
          <div className="about-text">
            <h2>Our Story</h2>
            <p>Welcome to Buttons Urban Flower Farm, where we're passionate about bringing the beauty of nature into urban spaces. Founded with a vision to make sustainable, locally-grown plants accessible to everyone, for sale right here on the North Shore. Check back often for updates! 🌼</p>
            
            <h2>Our Mission</h2>
            <p>We're dedicated to providing high-quality, sustainably grown plants while promoting urban agriculture and environmental stewardship. Every plant we grow is nurtured with care and attention to detail, ensuring you receive the healthiest specimens for your home or garden.</p>
            
            <div className="cta-section">
              <h2>Come Visit Our Farm</h2>
              <p>Experience the beauty of our farm in person and see how we grow our flowers!</p>
              <Link 
                to="/contact?subject=Schedule%20a%20Visit" 
                className="visit-button"
              >
                Schedule a Visit
              </Link>
            </div>
          </div>

          <div className="about-features">
            <div className="feature-card">
              <div className="feature-icon">🌱</div>
              <h3>Sustainable Growing</h3>
              <p>Eco-friendly practices and organic methods</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌿</div>
              <h3>Local & Fresh</h3>
              <p>Grown right here in our urban farm</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌺</div>
              <h3>Expert Care</h3>
              <p>Professional guidance for your plants</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About; 