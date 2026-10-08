/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rosa: { claro: '#FCE7F3', DEFAULT: '#EC4899', escuro: '#BE185D' },
        lilas: '#EDE9FE',
        roxo: '#7C3AED',
        grafite: '#1F2937',
        ok: '#16A34A',
        alerta: '#F59E0B',
        perigo: '#DC2626',
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      boxShadow: { suave: '0 8px 30px rgba(124,58,237,0.08)' },
      borderRadius: { card: '1.25rem' },
    },
  },
  plugins: [],
};
