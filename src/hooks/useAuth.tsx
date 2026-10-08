import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ENFORCE_PLANS, supabase, supabaseConfigured } from '../services/supabase';
import { getBusiness, getPlan, getProfile } from '../services/api';
import type { Business, PlanId } from '../types';

export type Feature = 'fichas' | 'promocoes' | 'metas' | 'equilibrio' | 'canais' | 'relatorios' | 'exportacao';

interface AuthState {
  session: Session | null;
  loading: boolean;
  business: Business | null;
  plan: PlanId;
  nome: string;
  notificacoes: boolean;
  can: (f: Feature) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [plan, setPlan] = useState<PlanId>('free');
  const [nome, setNome] = useState('');
  const [notificacoes, setNotificacoes] = useState(true);

  const carregar = useCallback(async (s: Session | null) => {
    if (!s) {
      setBusiness(null); setPlan('free'); setNome('');
      return;
    }
    try {
      const [b, p, prof] = await Promise.all([getBusiness(), getPlan(), getProfile()]);
      setBusiness(b);
      setPlan(p.plan);
      setNome(prof.full_name || (s.user.user_metadata?.full_name as string) || s.user.email?.split('@')[0] || '');
      setNotificacoes(prof.preferences?.notificacoes !== false);
    } catch (e) {
      console.error('Falha ao carregar dados do usuário', e);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await carregar(data.session);
      setLoading(false);
      document.getElementById('splash')?.remove();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s);
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT' || evento === 'USER_UPDATED') setTimeout(() => void carregar(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [carregar]);

  useEffect(() => { if (!loading) document.getElementById('splash')?.remove(); }, [loading]);

  const value: AuthState = {
    session, loading, business, plan, nome, notificacoes,
    can: () => !ENFORCE_PLANS || plan === 'pro',
    refresh: async () => { await carregar(session); },
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
