// Centralized API configuration for QuoteKaro Admin
const rawUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').trim().replace(/\/$/, '');
export const API_BASE_URL = rawUrl.endsWith('/api/v1') ? rawUrl : `${rawUrl}/api/v1`;
export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
