import { createRoot } from 'react-dom/client'
import App from './App.tsx'
// The real main-site stylesheet (design tokens, .btn/.form-group/.section-*
// utility classes) — imported directly rather than duplicated, since the
// reused calculator pages (frontend/src/pages/calculators/CalculatorPages.tsx)
// depend on these exact classes for "bilkul vesa hi" visual parity.
import '../../frontend/src/styles/globals.css'
import './campaign.css'

createRoot(document.getElementById('root')!).render(<App />)
