import React, { useState } from 'react';
import './NewsletterModal.css';

function NewsletterModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically handle the email submission
    console.log('Email submitted:', email);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Welcome!</h2>
        <p>Join our mailing list and get 20% off your first order.</p>
        <form onSubmit={handleSubmit} className="email-form">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="subscribe-button">Subscribe</button>
        </form>
        <p className="privacy-note">We respect your privacy</p>
      </div>
    </div>
  );
}

export default NewsletterModal; 