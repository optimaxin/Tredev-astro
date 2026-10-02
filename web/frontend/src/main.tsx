import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { patchDomForGoogleTranslate } from './utils/googleTranslate.ts'

// Must run before React's first render — see that function's own comment
// for why (Google Translate's live DOM edits otherwise crash React's
// reconciler on a later re-render of the same subtree).
patchDomForGoogleTranslate()

createRoot(document.getElementById('root')!).render(
  <App />
)
