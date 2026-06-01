
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

const rootElement = document.getElementById('root');
const bootstrap = document.getElementById('shadowshare-bootstrap');

if (!rootElement) {
  throw new Error('Missing #root element');
}

const root = createRoot(rootElement);
root.render(<App />);

const syncBootstrap = () => {
  if (!bootstrap) return;
  bootstrap.dataset.hidden = rootElement.childElementCount > 0 ? 'true' : 'false';
};

syncBootstrap();

const observer = new MutationObserver(syncBootstrap);
observer.observe(rootElement, { childList: true, subtree: true });

window.addEventListener('beforeunload', () => observer.disconnect());
  