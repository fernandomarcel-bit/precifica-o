import type { PricingInput } from '../utils/pricing';

export interface DemoProduct { name: string; category: string; input: PricingInput }

const base = { frete: 0, perdasPct: 3, impostosPct: 4, taxasPct: 3, comissaoPct: 0 };

/** Dados de DEMONSTRAÇÃO — sempre gravados com is_demo = true e nunca misturados aos dados reais. */
export const DEMO_PRODUCTS: DemoProduct[] = [
  { name: 'Sacolé Gourmet', category: 'Doces', input: { ...base, materiais: 2.2, maoDeObra: 0.9, embalagem: 0.4, outros: 0.2, custosFixos: 600, unidadesMes: 400, margemPct: 40 } },
  { name: 'Trufa', category: 'Doces', input: { ...base, materiais: 1.6, maoDeObra: 0.8, embalagem: 0.5, outros: 0.1, custosFixos: 600, unidadesMes: 500, margemPct: 45 } },
  { name: 'Bolo no Pote', category: 'Sobremesas', input: { ...base, materiais: 4.8, maoDeObra: 2.0, embalagem: 1.2, outros: 0.3, custosFixos: 600, unidadesMes: 250, margemPct: 8 } },
  { name: 'Pudim', category: 'Sobremesas', input: { ...base, materiais: 6.5, maoDeObra: 2.5, embalagem: 1.5, outros: 0.5, custosFixos: 600, unidadesMes: 120, margemPct: 30 } },
  { name: 'Mousse', category: 'Sobremesas', input: { ...base, materiais: 5.0, maoDeObra: 2.2, embalagem: 1.3, outros: 0.4, frete: 1.5, custosFixos: 600, unidadesMes: 150, margemPct: 0, impostosPct: 4, taxasPct: 3 } },
];
