import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type T = { id: number; msg: string; tipo: 'ok' | 'erro' };
const Ctx = createContext<{ ok: (m: string) => void; erro: (m: string) => void }>({ ok: () => {}, erro: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((msg: string, tipo: T['tipo']) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, msg, tipo }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={{ ok: (m) => push(m, 'ok'), erro: (m) => push(m, 'erro') }}>
      {children}
      <div className="fixed left-0 right-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 pointer-events-none" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className="toast-in pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-grafite shadow-suave ring-1 ring-black/5">
            {t.tipo === 'ok' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-perigo" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
