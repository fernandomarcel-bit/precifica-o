export const brl = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Recebe fração (0.3) e devolve "30%". */
export const pctFmt = (fracao: number, casas = 1): string =>
  `${((Number.isFinite(fracao) ? fracao : 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;

export const int = (n: number): string => (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR');

/**
 * Converte texto de input (padrão brasileiro) em número. Vazio vira 0; inválido vira NaN.
 * "1.500,50" → 1500.5 · "1.500" → 1500 (milhar) · "12,5" → 12.5 · "12.5" → 12.5
 */
export const num = (v: string | number | null | undefined): number => {
  if (typeof v === 'number') return v;
  const t = (v ?? '').trim().replace(/\s/g, '');
  if (!t) return 0;
  let limpo = t;
  if (t.includes(',')) limpo = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) limpo = t.replace(/\./g, '');
  if (!/^\d*\.?\d*$/.test(limpo) || limpo === '.') return NaN;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : NaN;
};

/** Para exibir número do banco em um input. */
export const toInput = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(n).replace('.', ','));
