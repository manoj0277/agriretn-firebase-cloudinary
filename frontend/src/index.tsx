// REACT NATIVE MIGRATION NOTE:
// This file and `../index.html` are the entry point for the React WEB prototype.
// A React Native application would have a different entry point.
// Typically, you would have an App.tsx at the root, which is registered
// using the `AppRegistry` from 'react-native'.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);