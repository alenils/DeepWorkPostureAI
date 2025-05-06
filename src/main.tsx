import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { PostureProvider } from './context/PostureContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostureProvider>
      <App />
    </PostureProvider>
  </React.StrictMode>,
) 