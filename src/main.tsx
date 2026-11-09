import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts';
import './styles/global.css';
import App from './App';
import { captureAuthLink } from './sync/authLink';

// Read an email sign-in link's details before the first redirect can drop them.
captureAuthLink();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
