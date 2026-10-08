import type { StatusPreco, Unidade } from '../utils/pricing';

export type PlanId = 'free' | 'pro';

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  segment: string;
  main_goal: string | null;
  logo_url: string | null;
}

export interface Product {
  id: string;
  business_id: string;
  recipe_id: string | null;
  name: string;
  category: string | null;
  is_demo: boolean;
  materiais: number;
  mao_de_obra: number;
  embalagem: number;
  outros: number;
  frete: number;
  perdas_pct: number;
  custos_fixos: number;
  unidades_mes: number;
  impostos_pct: number;
  taxas_pct: number;
  comissao_pct: number;
  margem_pct: number;
  custo_variavel: number;
  custo_total: number;
  preco_minimo: number;
  preco_recomendado: number;
  lucro_unitario: number;
  margem_real: number;
  faturamento_mensal: number;
  lucro_mensal: number;
  status: StatusPreco;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string | null;
  rendimento: number;
  custo_total: number;
  custo_unitario: number;
  created_at: string;
}

export interface RecipeIngredientRow {
  id?: string;
  nome: string;
  quantidade: number;
  unidade: Unidade;
  preco_compra: number;
  qtd_comprada: number;
  unidade_compra: Unidade;
  posicao?: number;
}

export interface Promotion {
  id: string;
  product_id: string | null;
  nome: string;
  preco_normal: number;
  custo_unitario: number;
  desconto_pct: number;
  taxas_pct: number;
  preco_promocional: number;
  lucro_normal: number;
  lucro_promocional: number;
  margem_promocional: number;
  status: 'saudavel' | 'atencao' | 'prejuizo';
  created_at: string;
}

export interface Goal {
  id: string;
  mes: string;
  meta_faturamento: number;
  dias_venda: number;
  preco_medio: number;
  custo_medio: number;
  realizado: number;
  created_at: string;
}

export interface SalesChannelRow {
  id?: string;
  product_id: string;
  canal: string;
  preco: number;
  taxa_pct: number;
  comissao_pct: number;
  custo: number;
  lucro_liquido: number;
  margem: number;
}

export interface HistoryRow {
  id: string;
  created_at: string;
  input: Record<string, number>;
  result: { precoRecomendado: number; lucroUnitario: number; margem: number; custoTotal: number };
}
