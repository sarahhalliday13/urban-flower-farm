/**
 * CORS Proxy Service
 * 
 * This service helps bypass CORS restrictions by using a proxy service
 * to make requests to the Google Sheets API.
 */

// List of public CORS proxies to try
const CORS_PROXIES = [
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?'
];

/**
 * Adds a CORS proxy to a URL
 * @param {string} url - The original URL to proxy
 * @returns {string} - The proxied URL
 */
export const addCorsProxy = (url) => {
  // Use the first proxy by default
  return `${CORS_PROXIES[0]}${url}`;
};

/**
 * Fetches data through a CORS proxy
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - The fetch response
 */
export const fetchThroughProxy = async (url, options = {}) => {
  // Try each proxy in sequence
  for (const proxy of CORS_PROXIES) {
    try {
      console.log(`Attempting to fetch through proxy: ${proxy}`);
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl, {
        ...options,
        headers: {
          ...options.headers,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (response.ok) {
        console.log(`Successfully fetched through proxy: ${proxy}`);
        return response;
      }
    } catch (error) {
      console.warn(`Error using proxy ${proxy}:`, error.message);
    }
  }
  
  throw new Error('All CORS proxies failed. Unable to fetch data.');
};

// Create a named object before exporting as default
const corsProxyService = {
  addCorsProxy,
  fetchThroughProxy
};

export default corsProxyService; 