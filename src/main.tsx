import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const LEGACY_DB_RETIREMENT_KEY = 'forge-fitness:indexeddb-retired'

function retireLegacyIndexedDb() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return
  }

  try {
    if (window.localStorage.getItem(LEGACY_DB_RETIREMENT_KEY) === 'true') {
      return
    }
  } catch {
    return
  }

  try {
    const request = window.indexedDB.deleteDatabase('forge-fitness-db')

    const markRetired = () => {
      try {
        window.localStorage.setItem(LEGACY_DB_RETIREMENT_KEY, 'true')
      } catch {
        // Ignore storage access errors.
      }
    }

    request.onsuccess = markRetired
    request.onerror = markRetired
  } catch {
    // Ignore IndexedDB availability errors.
  }
}

async function cleanupDevPwaState() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return
  }

  const host = window.location.hostname
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }

  if ('caches' in window) {
    const cacheKeys = await caches.keys()
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)))
  }
}

retireLegacyIndexedDb()
void cleanupDevPwaState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
