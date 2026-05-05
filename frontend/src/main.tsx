// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './echo'
import 'bootstrap/dist/css/bootstrap.min.css'
import '/src/assets/css/index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <App />
  // </StrictMode>,

  
)
