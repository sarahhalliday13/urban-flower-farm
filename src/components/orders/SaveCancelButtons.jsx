import React from 'react';

/**
 * SaveCancelButtons - A reusable component for save and cancel buttons
 * This avoids direct click handler references in the OrderEditor
 */
const SaveCancelButtons = ({ 
  onSave, 
  onFinalize, 
  onCancel, 
  isDisabled, 
  isSaving 
}) => {
  // Handle save click with safe error handling
  const handleSaveClick = () => {
    try {
      console.log("Save button clicked");
      if (typeof onSave === 'function') {
        onSave();
      } else {
        console.error("Save handler is not a function");
      }
    } catch (error) {
      console.error("Error in save button click handler:", error);
    }
  };

  // Handle finalize click with safe error handling
  const handleFinalizeClick = () => {
    try {
      console.log("Finalize button clicked");
      if (typeof onFinalize === 'function') {
        onFinalize();
      } else {
        console.error("Finalize handler is not a function");
      }
    } catch (error) {
      console.error("Error in finalize button click handler:", error);
    }
  };

  // Handle cancel click with safe error handling
  const handleCancelClick = () => {
    try {
      console.log("Cancel button clicked");
      if (typeof onCancel === 'function') {
        onCancel();
      } else {
        console.error("Cancel handler is not a function");
      }
    } catch (error) {
      console.error("Error in cancel button click handler:", error);
    }
  };

  return (
    <div className="editor-actions">
      <button 
        className="save-changes-btn"
        onClick={handleSaveClick}
        disabled={isDisabled || isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
      
      <button 
        className="finalize-order-btn"
        onClick={handleFinalizeClick}
        disabled={isDisabled || isSaving}
      >
        {isSaving ? 'Finalizing...' : 'Finalize Order'}
      </button>
      
      <button 
        className="cancel-edit-btn"
        onClick={handleCancelClick}
        disabled={isSaving}
      >
        Cancel
      </button>
    </div>
  );
};

export default SaveCancelButtons; 