
// This file configures development server proxying
module.exports = function(app) {
  // Handle SPA routes
  app.use((req, res, next) => {
    // Skip for API requests and assets
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/static') ||
        req.path.includes('.')) {
      return next();
    }
    
    // For all other routes, serve the index.html
    if (!req.path.startsWith('/index.html')) {
      if (req.method === 'GET') {
        console.log('SPA route:', req.path, '-> /index.html');
        req.url = '/index.html';
      }
    }
    next();
  });
};
