import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import ArchitecturePage from './ArchitecturePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ArchitecturePage />
  </StrictMode>,
)
