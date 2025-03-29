// Firebase Fix Script - For React App Integration
// Add this script to your index.html before any Firebase imports
(function() {
  console.log("Firebase fix for app running");
  
  // Remove any existing CSP meta tags
  Array.from(document.head.getElementsByTagName('meta'))
    .filter(meta => meta.httpEquiv === 'Content-Security-Policy')
    .forEach(meta => meta.remove());
  
  // Add permissive CSP
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "default-src * ws: wss: 'unsafe-inline' 'unsafe-eval' blob: data:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * ws: wss:; img-src * data: blob:; frame-src *; style-src * 'unsafe-inline';";
  document.head.insertBefore(meta, document.head.firstChild);
  
  // Add CORS header
  const corsMetaTag = document.createElement('meta');
  corsMetaTag.httpEquiv = 'Access-Control-Allow-Origin';
  corsMetaTag.content = '*';
  document.head.insertBefore(corsMetaTag, document.head.firstChild);
  
  // Override fetch for Firebase connections
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    // For Firebase URLs, ensure proper CORS
    if (typeof url === 'string' && (url.includes('firebaseio.com') || url.includes('firebase'))) {
      console.log('Firebase fetch detected:', url);
      
      // Add CORS headers to options
      options = options || {};
      options.mode = 'cors';
      options.headers = options.headers || {};
      
      // Return the fetch with options
      return originalFetch(url, options)
        .catch(error => {
          console.error('Firebase fetch error:', error.message);
          
          // If CORS error, try with proxy
          if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
            console.warn('Retrying Firebase fetch with CORS proxy');
            const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
            return originalFetch(proxyUrl, options);
          }
          throw error;
        });
    }
    
    // For all other URLs, use original fetch
    return originalFetch(url, options);
  };
  
  // Monitor WebSocket connections (Firebase uses these)
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    console.log('WebSocket connection to:', url);
    return new OriginalWebSocket(url, protocols);
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
  
  console.log("Firebase fix for app completed");
})(); 