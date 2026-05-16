import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import store from './store/store'
import './index.css'
import App from './App.jsx'

/* Envuelve la app en el Provider de Redux para que todos los componentes
   puedan acceder al store global (auth, chat, profile, recommendations) */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
