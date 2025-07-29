import React, { useState } from 'react';
import '../styles/FAQ.css';

const FAQ = () => {
  // State to track which FAQ items are expanded
  const [expandedItems, setExpandedItems] = useState({});

  // Toggle expanded state for an item
  const toggleItem = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // FAQ data structure
  const faqItems = [
    {
      id: 1,
      question: "How do I know if a plant is available?",
      answer: "Each plant shows its inventory status. \"In Stock\" means readily available, \"Low Stock\" means limited quantity remaining, and \"Out of Stock\" means temporarily unavailable."
    },
    {
      id: 2,
      question: "How do I pay for my order?",
      answer: "After placing your order, you'll receive instructions for e-transfer payment to buttonsflowerfarm@telus.net or cash payment at pickup."
    },
    {
      id: 3,
      question: "Can I modify my order after placing it?",
      answer: "Please contact us directly at buttonsflowerfarm@telus.net if you need to make changes to your order."
    },
    {
      id: 4,
      question: "When can I pick up my plants?",
      answer: "After placing your order, we'll contact you to arrange a convenient pickup time at the farm."
    },
    {
      id: 5,
      question: "Do you offer delivery?",
      answer: "Currently, we offer pickup only at our farm location. We'll arrange a convenient pickup time after you place your order."
    },
    {
      id: 6,
      question: "What is your return policy?",
      answer: "Due to the nature of living plants, we cannot accept returns. However, if you have any issues with your plants, please contact us within 48 hours of pickup, and we'll work with you to find a solution."
    },
    {
      id: 7,
      question: "How do I care for my plants?",
      answer: "Each plant in our shop includes basic care instructions. For more detailed guidance, please refer to the care information provided at pickup or contact us with specific questions."
    },
    {
      id: 8,
      question: "Are your plants suitable for my growing zone?",
      answer: "We primarily offer plants suitable for the Metro Vancouver region (Zone 8). Plant descriptions indicate hardiness where applicable. Feel free to contact us with questions about specific plants."
    }
  ];

  return (
    <div className="shop-container">
      <div className="shop-header">
        <h1 className="shop-title">Frequently Asked Questions</h1>
      </div>
      
      <p className="shop-description">
        Find answers to common questions about shopping with Buttons Flower Farm. 
        If you don't see your question here, please <a href="/contact">contact us</a>.
      </p>
      
      <div className="faq-list">
        {faqItems.map(item => (
          <div 
            key={item.id} 
            className={`faq-item ${expandedItems[item.id] ? 'expanded' : ''}`}
          >
            <div 
              className="faq-question" 
              onClick={() => toggleItem(item.id)}
            >
              <h3>{item.question}</h3>
              <span className="faq-icon">
                {expandedItems[item.id] ? '−' : '+'}
              </span>
            </div>
            <div className="faq-answer">
              <p>{item.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ; 