import React from 'react';

/**
 * NotesCell - Displays order notes with highlighting for pickup information
 * @param {Object} props - Component props
 * @param {string} props.notes - The order notes
 */
const NotesCell = ({ notes }) => {
  if (!notes) return null;

  // Highlight pickup-related words with special styling
  const highlightPickupNotes = (text) => {
    // Words related to pickup that should be highlighted
    const pickupKeywords = ['pickup', 'pick up', 'pick-up', 'collect', 'collecting'];
    
    // Check if any keyword is in the text
    const containsPickupKeyword = pickupKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // If it contains pickup keyword, add the highlight class
    const className = containsPickupKeyword ? 'notes-highlight pickup-note' : '';
    
    return (
      <p className={className}>{text}</p>
    );
  };

  return (
    <div className="order-notes">
      <h4>Order Notes</h4>
      {highlightPickupNotes(notes)}
    </div>
  );
};

export default NotesCell;
