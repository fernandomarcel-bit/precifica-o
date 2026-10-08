import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, Loader2, Lock, Tag, XCircle } from 'lucide-react';
import type { StatusPreco } from '../utils/pricing';
import { ENFORCE_PLANS } from '../services/supabase';

export const FRASE_RESPONSABILIDADE =
  'Esta ferramenta é destinada ao controle gerencial e à formação de preços. Regras tributárias variam conforme atividade, regime e localidade. Quando necessário, consulte um contador.';

export function Logo({ className = '', claro = false }: { className?: string; claro?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rosa to-roxo text-white shadow-md">
        <Tag className="h-5 w-5" aria-hidden />
      </span>
      <span className={claro ? 'text-white' : 'text-rosa-escuro'}>Precificação <span className="text-roxo">PRO</span></span>
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin ${className}`} aria-label="Carregando" />;
}
export const PaginaCarregando = () => (
  <div className="grid min-h-[50vh] place-items-center text-roxo"><Spinner className="h-8 w-8" /></div>
);

export function PageHeader({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: string; acao?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-grafite sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 max-w-2xl text-gray-600">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Button({ variante = 'primary', carregando, children, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primary' | 'roxo' | 'soft' | 'ghost' | 'danger'; carregando?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || carregando} className={`btn-${variante} ${className}`}>
      {carregando && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  erro?: string;
  prefixo?: string;
  sufixo?: string;
}
export function Field({ label, hint, erro, prefixo, sufixo, className = '', ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        {prefixo && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">{prefixo}</span>}
        <input
          id={id}
          aria-invalid={!!erro}
          aria-describedby={hint || erro ? `${id}-d` : undefined}
          className={`input ${erro ? 'input-erro' : ''} ${prefixo ? 'pl-11' : ''} ${sufixo ? 'pr-10' : ''}`}
          {...rest}
        />
        {sufixo && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">{sufixo}</span>}
      </div>
      {(hint || erro) && <p id={`${id}-d`} className={`hint ${erro ? '!text-perigo font-medium' : ''}`}>{erro || hint}</p>}
    </div>
  );
}

/** Campo numérico em reais / percentual / quantidade (aceita vírgula). */
export function NumField(p: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & FieldProps) {
  return <Field inputMode="decimal" autoComplete="off" placeholder="0" {...p} />;
}

export function SelectField({ label, hint, className = '', children, ...rest }: { label: string; hint?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className="input" {...rest}>{children}</select>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export const STATUS_INFO: Record<StatusPreco, { emoji: string; texto: string; cor: string; curto: string }> = {
  saudavel: { emoji: '🟢', texto: 'PREÇO SAUDÁVEL', curto: 'Margem saudável', cor: 'bg-green-50 text-ok ring-green-200' },
  baixa: { emoji: '🟡', texto: 'MARGEM BAIXA', curto: 'Margem baixa', cor: 'bg-amber-50 text-amber-700 ring-amber-200' },
  prejuizo: { emoji: '🔴', texto: 'RISCO DE PREJUÍZO', curto: 'Risco de prejuízo', cor: 'bg-red-50 text-perigo ring-red-200' },
};

export function StatusBadge({ status, longo = false }: { status: StatusPreco; longo?: boolean }) {
  const s = STATUS_INFO[status];
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ring-1 ${s.cor}`}><span aria-hidden>{s.emoji}</span>{longo ? s.texto : s.curto}</span>;
}

export function Aviso({ tom = 'info', children }: { tom?: 'info' | 'ok' | 'alerta' | 'perigo'; children: ReactNode }) {
  const m = {
    info: ['bg-lilas text-roxo', Info], ok: ['bg-green-50 text-green-800', CheckCircle2],
    alerta: ['bg-amber-50 text-amber-800', AlertTriangle], perigo: ['bg-red-50 text-red-800', XCircle],
  } as const;
  const [cls, Icon] = m[tom];
  return (
    <div role={tom === 'perigo' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${cls}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><div>{children}</div>
    </div>
  );
}

export function Stat({ rotulo, valor, destaque }: { rotulo: string; valor: ReactNode; destaque?: boolean }) {
  return (
    <div className="card">
      <p className="text-sm font-medium text-gray-600">{rotulo}</p>
      <p className={`mt-1 text-2xl font-extrabold ${destaque ? 'text-roxo' : 'text-grafite'}`}>{valor}</p>
    </div>
  );
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="card grid place-items-center gap-3 py-12 text-center">
      <p className="text-lg font-bold">{titulo}</p>
      {texto && <p className="max-w-md text-gray-600">{texto}</p>}
      {acao}
    </div>
  );
}

export function Modal({ aberto, onFechar, titulo, children }: { aberto: boolean; onFechar: () => void; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', h);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', h);
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" onClick={onFechar}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()} className="pop w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <h2 className="mb-3 text-xl font-extrabold">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Confirmar({ aberto, titulo, texto, rotulo = 'Excluir', carregando, onConfirmar, onFechar }:
  { aberto: boolean; titulo: string; texto: string; rotulo?: string; carregando?: boolean; onConfirmar: () => void; onFechar: () => void }) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={titulo}>
      <p className="mb-5 text-gray-700">{texto}</p>
      <div className="flex gap-3">
        <Button variante="ghost" className="flex-1" onClick={onFechar}>Cancelar</Button>
        <Button variante="danger" className="flex-1" carregando={carregando} onClick={onConfirmar}>{rotulo}</Button>
      </div>
    </Modal>
  );
}

/** Bloqueia módulos PRO no plano FREE (quando VITE_ENFORCE_PLANS=true). */
export function ProGate({ liberado, nome, children }: { liberado: boolean; nome: string; children: ReactNode }) {
  if (liberado || !ENFORCE_PLANS) return <>{children}</>;
  return (
    <div className="card grid place-items-center gap-3 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lilas text-roxo"><Lock /></span>
      <p className="text-xl font-extrabold">{nome} faz parte do plano PRO</p>
      <p className="max-w-md text-gray-600">No plano PRO você tem produtos ilimitados, fichas técnicas, promoções, metas, canais, relatórios e exportação.</p>
      <Link to="/app/configuracoes" className="btn-primary">Ver meu plano</Link>
    </div>
  );
}

export function Dica({ children }: { children: ReactNode }) {
  return <p className="flex items-start gap-2 rounded-2xl bg-lilas/60 px-4 py-3 text-sm text-roxo"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{children}</p>;
}

export function Rodape({ className = '' }: { className?: string }) {
  return <p className={`text-xs leading-relaxed text-gray-600 ${className}`}>{FRASE_RESPONSABILIDADE}</p>;
}

export function BadgeDemo() {
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800 ring-1 ring-amber-300">DEMONSTRAÇÃO</span>;
}
