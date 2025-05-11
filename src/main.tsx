import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { PostureProvider } from './context/PostureContext'
import { AudioProvider } from './features/audio/AudioProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostureProvider>
      <AudioProvider>
        <App />
      </AudioProvider>
    </PostureProvider>
  </React.StrictMode>,
) 