import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Isso é crucial para o Tailwind funcionar!

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);