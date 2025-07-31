import React from 'react';
import FilePicker from 'react-file-picker';

function SimpleImageUpload({ onImageSelect }) {
  const handleFileSelect = (files) => {
    const file = files[0];
    if (file) {
      console.log('File selected:', file.name);
      if (onImageSelect) {
        onImageSelect(file);
      }
    }
  };

  return (
    <div>
      <div style={{ margin: '20px', textAlign: 'center' }}>
        <FilePicker
          onChange={handleFileSelect}
          accept={['image/jpeg', 'image/png', 'image/gif']}
          maxSize={5}
        >
          <button
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Choose Image
          </button>
        </FilePicker>
      </div>
      <div
        style={{
          margin: '20px',
          padding: '40px',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          backgroundColor: 'white',
          textAlign: 'center'
        }}
      >
        <p style={{ margin: 0 }}>
          Click the button above to select an image
        </p>
      </div>
    </div>
  );
}

export default SimpleImageUpload; 