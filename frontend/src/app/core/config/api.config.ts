export const API_CONFIG = {
  // Use same-origin in production behind Nginx reverse proxy.
  baseUrl: '/api',
  socketUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000',
};
