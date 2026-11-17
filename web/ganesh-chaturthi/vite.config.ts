import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Own port — kept off the main frontend's 5173 so both can run at once
// during dev without a clash.
//
// Deploying this app on its own separate domain (the normal setup — this is
// its own Vite app, not served by the shared `backend`): set VITE_API_URL in
// this app's own build environment to the real deployed backend URL (e.g.
// https://api.tredevaastro.com). Without it, frontend/src/services/apiUrl.ts
// falls back to http://localhost:4000, which only works in local dev where
// both this app and the backend run on one machine. The backend's own
// CLIENT_ORIGIN (for CORS) and CAMPAIGN_APP_URL (so its Playwright PDF
// pipeline can reach this app to render a Kundli report) need this app's
// deployed URL too — see backend/.env.example.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1409,
    strictPort: true,
  },
  // html2canvas/jspdf are only ever reached via a dynamic import() inside
  // KundliSection.tsx (frontend/src/..., a DIFFERENT workspace package) —
  // Vite's dependency pre-bundler crawls from this app's own entry points
  // and doesn't reliably discover an import buried in a sibling package
  // that way, so the first time someone actually clicked Download in dev,
  // it 404'd with "Outdated Optimize Dep" / "Failed to fetch dynamically
  // imported module" instead of ever starting the PDF. Listing them here
  // makes Vite pre-bundle both eagerly on startup instead of discovering
  // (and stumbling on) them lazily at click time.
  optimizeDeps: {
    include: ['html2canvas', 'jspdf'],
  },
})
