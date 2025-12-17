// index.js - Simplified version
import React from 'https://esm.sh/react@18';
import ReactDOM from 'https://esm.sh/react-dom@18';
import htm from 'https://esm.sh/htm@3.1.1';
import App from './App.js';

const html = htm.bind(React.createElement);

// Render the app
ReactDOM.render(
  html`<${App} />`,
  document.getElementById('root')
);

console.log('App rendered from index.js');
