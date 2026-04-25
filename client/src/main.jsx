import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('SW registered:', reg.scope),
      (err) => console.warn('SW registration failed:', err)
    );
  });
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  // Delay to avoid blocking render
  setTimeout(() => Notification.requestPermission(), 3000);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
