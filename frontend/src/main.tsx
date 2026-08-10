import React from 'react';
import ReactDOM from 'react-dom/client';

// Designsystemet: component styles and default theme
import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';

import App from './app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
