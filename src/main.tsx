import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fredoka';
import './styles.css';
import App from './App';
import { loadState } from './lib/storage';
import { applyTheme } from './lib/themes';
import { FamilyProvider } from './state/FamilyContext';
import { UIProvider } from './state/UIContext';

const initialState = loadState();
applyTheme(initialState.skin, initialState.customTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FamilyProvider initialState={initialState}>
      <UIProvider>
        <App />
      </UIProvider>
    </FamilyProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is a bonus; the app works without it.
    });
  });
}
