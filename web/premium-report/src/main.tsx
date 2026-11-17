import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// This app has no theme toggle — see styles/app.css's comment. The main
// site's own default for a fresh session is the light (parchment) theme,
// so this sets it once, statically, rather than defaulting to the dark
// root tokens that `:root` alone would otherwise render.
document.documentElement.setAttribute('data-theme', 'light')

createRoot(document.getElementById('root')!).render(<App />)
