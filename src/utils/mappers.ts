import type { Product } from '../types';
import type { PricingInput, PricingResult } from './pricing';

export const rowToInput = (p: Product): PricingInput => ({
  materiais: Number(p.materiais),
  maoDeObra: Number(p.mao_de_obra),
  embalagem: Number(p.embalagem),
  outros: Number(p.outros),
  frete: Number(p.frete),
  perdasPct: Number(p.perdas_pct),
  custosFixos: Number(p.custos_fixos),
  unidadesMes: Number(p.unidades_mes),
  impostosPct: Number(p.impostos_pct),
  taxasPct: Number(p.taxas_pct),
  comissaoPct: Number(p.comissao_pct),
  margemPct: Number(p.margem_pct),
});

export function buildProductRow(
  input: PricingInput,
  r: Extract<PricingResult, { ok: true }>,
  meta: { name: string; category: string | null; business_id: string; recipe_id?: string | null; is_demo?: boolean }
) {
  return {
    business_id: meta.business_id,
    recipe_id: meta.recipe_id ?? null,
    name: meta.name.trim(),
    category: meta.category?.trim() || null,
    is_demo: meta.is_demo ?? false,
    materiais: input.materiais,
    mao_de_obra: input.maoDeObra,
    embalagem: input.embalagem,
    outros: input.outros,
    frete: input.frete,
    perdas_pct: input.perdasPct,
    custos_fixos: input.custosFixos,
    unidades_mes: input.unidadesMes,
    impostos_pct: input.impostosPct,
    taxas_pct: input.taxasPct,
    comissao_pct: input.comissaoPct,
    margem_pct: input.margemPct,
    custo_variavel: r.custoVariavel,
    custo_total: r.custoTotal,
    preco_minimo: r.precoMinimo,
    preco_recomendado: r.precoRecomendado,
    lucro_unitario: r.lucroUnitario,
    margem_real: r.margem,
    faturamento_mensal: r.faturamentoMensal,
    lucro_mensal: r.lucroMensal,
    status: r.status,
  };
}
