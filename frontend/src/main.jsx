import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#27304a',
              color:      '#eceff5',
              border:     '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#00e0c7', secondary: '#0e1424' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff'     } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
