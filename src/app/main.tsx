import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { initAnalytics } from '@/lib/analytics';
import '@/index.css';

const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (import.meta.env.PROD && gaMeasurementId) {
  initAnalytics(gaMeasurementId);
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
