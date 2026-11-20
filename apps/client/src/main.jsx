import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { rememberTrafficSource } from './utils/trafficSource';

// Note where this visitor came from (Instagram ad, Google, ...) before any
// page changes the address bar
rememberTrafficSource();

createRoot(document.getElementById('root')).render(
  <App />
);
