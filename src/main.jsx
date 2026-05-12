import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ToasterProvider } from './components/Toaster.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToasterProvider>
        <App />
      </ToasterProvider>
    </ErrorBoundary>
  </StrictMode>,
)
