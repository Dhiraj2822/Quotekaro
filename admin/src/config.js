// Centralized API configuration for QuoteKaro Admin
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');
export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
