import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// When Vite can't load a lazy-loaded chunk (stale cache after a new deploy),
// reload the page once to pick up the fresh index.html and new asset hashes.
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
