// Imports the React library.
import React from 'react';
// Imports ReactDOM from 'react-dom/client' for React 18 root rendering APIs.
import ReactDOM from 'react-dom/client';
// Imports the root App component from the local App file.
import App from './App';

// Finds and retrieves the target DOM container element with the ID 'root' from the HTML document.
const rootElement = document.getElementById('root');

// Checks if the root DOM element exists before attempting to render.
if (rootElement) {
  // Creates a React root container attached to the DOM root element.
  const root = ReactDOM.createRoot(rootElement);
  // Renders the application inside the React StrictMode wrapper for development checks.
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Registers the PWA Service Worker for offline caching support
// index.tsx (or main.tsx)

if (
  'serviceWorker' in navigator &&
  (import.meta as ImportMeta & { env: { PROD: boolean } }).env.PROD
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}