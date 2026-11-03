import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A deliberately standalone, single-feature app: only Premium Report lives
// here, nothing else from the main TredevAstro site. It still reuses a
// handful of the main frontend's zero-context UI/service files directly via
// relative cross-workspace imports (styles/globals.css for visual parity,
// BirthDetailsForm + its subtree for birth-detail input, calculatorService
// and authService as API clients) — the same pattern web/ganesh-chaturthi
// already uses for its own cross-workspace reuse. Nothing with real site
// state (AppContext, cart, admin, consultations, etc.) is imported.
//
// Own port — kept off the main frontend's 5173 and the campaign's 1409 so
// all three can run at once during local dev without a clash.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
  },
})
