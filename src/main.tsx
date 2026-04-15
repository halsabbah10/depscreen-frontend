// Initialize Sentry BEFORE anything else so bootstrap errors are captured.
// No-op when VITE_SENTRY_DSN is unset.
import { initSentry } from './sentry'
initSentry()

import React from 'react'
import ReactDOM from 'react-dom/client'

// Fonts — Clinical Sanctuary typography.
// IBM Plex Sans Arabic was imported for a future Arabic UI; we ship only
// English today and no component references `font-arabic`. Cormorant
// italics were imported for serif pull-quotes but we ended up using
// italic on body text (Figtree) only. Trimmed both to shrink the CDN
// subset payload — grepped for co-occurrence with font-display /
// font-arabic before removing.
import '@fontsource/cormorant-garamond/300.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/figtree/300.css'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import '@fontsource/figtree/700.css'

// Styles
import './index.css'

// App
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
