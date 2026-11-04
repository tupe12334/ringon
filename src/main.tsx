import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { Crash } from './Crash.tsx'
import { initAnalytics } from './analytics'
import { countUsage } from './usage-counter'

initAnalytics()
countUsage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Crash>
      <App />
    </Crash>
  </StrictMode>,
)
