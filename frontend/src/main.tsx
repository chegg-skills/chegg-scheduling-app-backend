import * as Sentry from '@sentry/react'
import { browserTracingIntegration } from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// No-op when VITE_SENTRY_DSN is not set (local dev, test).
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [browserTracingIntegration()],
  tracesSampleRate: 0.1,
})

// When Vite can't load a lazy-loaded chunk (stale cache after a new deploy),
// capture the error then reload once to pick up fresh assets.
window.addEventListener('vite:preloadError', (event) => {
  Sentry.captureException(event.payload)
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
