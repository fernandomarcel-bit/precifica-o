import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
// Fora do fluxo de login (landing / tela de configuração) o splash também precisa sair.
setTimeout(() => document.getElementById('splash')?.remove(), 600);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
