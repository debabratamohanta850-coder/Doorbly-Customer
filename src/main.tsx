import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Immediately register Service Worker so mobile browsers enable direct app installation
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
