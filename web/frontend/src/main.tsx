import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { patchDomForBrowserTranslate } from './utils/translateDomSafety.ts'

// Must run before React's first render — see that function's own comment
// for why (a browser's own translate feature's live DOM edits otherwise
// crash React's reconciler on a later re-render of the same subtree).
patchDomForBrowserTranslate()

createRoot(document.getElementById('root')!).render(
  <App />
)
