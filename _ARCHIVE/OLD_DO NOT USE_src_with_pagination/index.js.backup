import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Polyfill for process in webpack 4
window.process = window.process || {};
window.process.env = window.process.env || {};

// Prevent automatic scroll restoration - handle it manually
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
  console.log('🔧 Setting scrollRestoration to manual at app level');
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', {
    message: event.message,
    source: event.filename,
    lineNo: event.lineno,
    colNo: event.colno,
    error: event.error
  });
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});
