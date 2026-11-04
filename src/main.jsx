import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { domAnimation, domMax, LazyMotion, MotionConfig } from 'motion/react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext'

const animationFeatures = { ...domAnimation, layout: domMax.layout }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <LazyMotion features={animationFeatures} strict>
            <App />
          </LazyMotion>
        </MotionConfig>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
