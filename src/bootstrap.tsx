import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

async function boot() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);
}

boot();
