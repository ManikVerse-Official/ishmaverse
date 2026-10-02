import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

/*
 * `basename` follows the build's base path: "/" when hosted at the domain root
 * and "/reportcard/" when embedded inside Ishmaverse. Without it the router
 * sees the "/reportcard/" prefix as part of the route and matches nothing —
 * which rendered a blank page inside the embed.
 */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

/*
 * PWA: register the shell service worker after load so it never competes with
 * the first paint. Only in production builds (a dev server would otherwise
 * serve stale shells). Registration is skipped silently on browsers that do
 * not support it — the app itself works without it.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* Offline shell unavailable; the app keeps working online. */
    })
  })
}
