import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';

// Note: SW registration is handled in index.html to avoid redundancy.

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(React.createElement(App));
}
