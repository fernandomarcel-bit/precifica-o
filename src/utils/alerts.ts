import type { Goal, Product } from '../types';
import { brl, pctFmt } from './format';

export interface Alerta { id: string; texto: string; tom: 'alerta' | 'perigo' | 'ok'; produtoId?: string }

/** Alertas inteligentes calculados no app. Poucos e relevantes: no máximo 6. */
export function gerarAlertas(produtos: Product[], metas: Goal[]): Alerta[] {
  const out: Alerta[] = [];
  for (const p of produtos) {
    if (Number(p.lucro_unitario) < 0.005)
      out.push({ id: `p-${p.id}`, produtoId: p.id, tom: 'perigo', texto: `Seu produto ${p.name} não gera lucro: o custo (${brl(Number(p.custo_total))}) consome o preço.` });
    else if (Number(p.margem_real) < 0.1)
      out.push({ id: `m-${p.id}`, produtoId: p.id, tom: 'alerta', texto: `Seu produto ${p.name} está com margem abaixo de 10% (${pctFmt(Number(p.margem_real))}).` });
  }
  const meta = metas[0];
  if (meta) {
    const prog = Number(meta.realizado) / Number(meta.meta_faturamento);
    if (prog >= 0.8 && prog < 1) out.push({ id: `g-${meta.id}`, tom: 'ok', texto: 'Você está próximo da sua meta mensal. Faltam só ' + brl(Number(meta.meta_faturamento) - Number(meta.realizado)) + '.' });
  }
  return out.sort((a, b) => (a.tom === 'perigo' ? -1 : 1) - (b.tom === 'perigo' ? -1 : 1)).slice(0, 6);
}
