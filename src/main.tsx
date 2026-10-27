import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/base.css'
import './styles/sections.css'
import './styles/chrome.css'
import './styles/daylight.css'
import './styles/linkedin.css'
import './styles/contact.css'

createRoot(document.getElementById('root')!).render(<App />)
