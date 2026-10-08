import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

// Cliente criado com valores neutros quando não configurado (a UI mostra a tela de configuração).
export const supabase = createClient(url || 'http://localhost:54321', key || 'sem-chave', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const ENFORCE_PLANS = import.meta.env.VITE_ENFORCE_PLANS === 'true';

/** Traduz erros do banco para mensagens que uma pessoa entende. */
export function mensagemErro(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (msg.includes('LIMITE_FREE')) return 'O plano FREE permite até 3 produtos. Faça upgrade para o PRO para cadastrar mais.';
  if (msg.includes('RECURSO_PRO')) return 'Este recurso faz parte do plano PRO.';
  if (msg.includes('percentuais_viaveis')) return 'Os percentuais informados tornam esse preço inviável. Revise seus custos, taxas ou margem.';
  if (msg.toLowerCase().includes('row-level security')) return 'Você não tem permissão para fazer isso.';
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('User already registered')) return 'Este e-mail já tem cadastro. Tente entrar.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (msg.includes('Failed to fetch')) return 'Sem conexão com o servidor. Verifique sua internet.';
  return msg || 'Algo deu errado. Tente novamente.';
}
