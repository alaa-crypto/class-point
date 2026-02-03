import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Office.js initialization
declare global {
  interface Window {
    Office: any;
  }
}

if (window.Office) {
  console.log('Office.js detected, initializing...');
  
  // Wait for Office to be ready before rendering React
  window.Office.onReady((info: any) => {
    console.log(`✅ Office.js ready for ${info.host} on ${info.platform}`);
    
    // Now it's safe to render React
    const root = ReactDOM.createRoot(
      document.getElementById('root') as HTMLElement
    );
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Report web vitals
    reportWebVitals();
  });
} else {
  console.log('⚠️ Running in browser (not Office context)');
  
  // Fallback for regular browser
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  reportWebVitals();
}