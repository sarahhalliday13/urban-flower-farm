import React from 'react';
import './Toast.css';

function Toast({ message, type = 'info', onClose, closing }) {
  const toastClass = `toast ${type} ${closing ? 'toast-exit' : 'toast-enter'}`;

  return (
    <div className={toastClass}>
      {message}
    </div>
  );
}

export default Toast; 