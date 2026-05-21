// ─── Node.js Polyfills (must be FIRST) ───────────────
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Sync initial theme from localStorage
const savedSettings = JSON.parse(localStorage.getItem('lokatani-settings') || '{}');
const theme = savedSettings?.state?.theme || 'dark';
if (theme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
