import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { checkStorageIntegrity } from './lib/migrations'

// Detect and repair corrupted localStorage before stores hydrate
checkStorageIntegrity()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
