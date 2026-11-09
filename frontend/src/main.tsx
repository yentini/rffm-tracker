import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Registro del Service Worker con actualización automática e inspección de cambios al enfocar la app
registerSW({
  immediate: true,
  onRegisteredSW(_swScriptUrl, registration) {
    if (registration) {
      // Al volver a la pestaña o abrir la PWA desde segundo plano, comprobar si hay versión nueva
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    }
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
