
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      console.log('Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('SW registered successfully:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          console.log('New service worker installing');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content available');
              // Could show update notification here
            }
          });
        }
      });
      
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
