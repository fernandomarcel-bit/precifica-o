import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listProducts } from '../services/api';
import { useAuth } from './useAuth';
import type { Product } from '../types';

export type Modo = 'real' | 'demo';

interface State {
  todos: Product[];
  produtos: Product[]; // já filtrados pelo modo (real OU demonstração — nunca misturados)
  temDemo: boolean;
  temReal: boolean;
  modo: Modo;
  setModo: (m: Modo) => void;
  loading: boolean;
  reload: () => Promise<void>;
}
const Ctx = createContext<State>(null as unknown as State);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { business } = useAuth();
  const [todos, setTodos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modoEscolhido, setModoEscolhido] = useState<Modo | null>(null);

  const reload = useCallback(async () => {
    if (!business) { setTodos([]); setLoading(false); return; }
    try { setTodos(await listProducts()); } finally { setLoading(false); }
  }, [business]);

  useEffect(() => { void reload(); }, [reload]);

  const temDemo = todos.some((p) => p.is_demo);
  const temReal = todos.some((p) => !p.is_demo);
  // Padrão: dados reais; se só existir demonstração, mostra a demonstração (sempre rotulada).
  const modo: Modo = modoEscolhido && ((modoEscolhido === 'demo' && temDemo) || modoEscolhido === 'real') ? modoEscolhido : temReal || !temDemo ? 'real' : 'demo';
  const produtos = useMemo(() => todos.filter((p) => (modo === 'demo' ? p.is_demo : !p.is_demo)), [todos, modo]);

  return <Ctx.Provider value={{ todos, produtos, temDemo, temReal, modo, setModo: setModoEscolhido, loading, reload }}>{children}</Ctx.Provider>;
}
export const useProducts = () => useContext(Ctx);
