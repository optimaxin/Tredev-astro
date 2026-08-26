// Single source of truth for the backend base URL. Strips any trailing
// slash(es) so every service can safely do `${API_URL}/api/...` — Express
// does not treat "//api/x" as "/api/x", so a trailing slash left in the
// VITE_API_URL env var (e.g. on Vercel) silently 404s every single request.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
