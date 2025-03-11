import React, { useEffect, useState } from 'react';
import './Toast.css';

function Toast({ message, onClose }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for exit animation to complete
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast ${isExiting ? 'toast-exit' : 'toast-enter'}`}>
      {message}
    </div>
  );
}

export default Toast; 