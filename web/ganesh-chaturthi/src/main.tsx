import { createRoot } from 'react-dom/client'
import App from './App.tsx'
// The real main-site stylesheet (design tokens, .btn/.form-group/.section-*
// utility classes) — imported directly rather than duplicated, since the
// reused calculator pages (frontend/src/pages/calculators/CalculatorPages.tsx)
// depend on these exact classes for "bilkul vesa hi" visual parity.
import '../../frontend/src/styles/globals.css'
import './campaign.css'

// This campaign has no language switcher of its own and is only ever meant
// to be in English — but it shares AppContext (and its localStorage
// `language` key) with the main site, which DOES have a switcher. Reused
// components (FreeTools, KundliSection, etc.) read that shared `language`
// value, so if someone's browser ever had it set to something else on this
// exact origin, this app would silently inherit it. Force it to 'en' on
// every load, before AppProvider's first render picks it up, so this app
// can never show anything but English regardless of what's stored.
localStorage.setItem('language', 'en')

createRoot(document.getElementById('root')!).render(<App />)
