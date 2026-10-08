/**
 * ÚNICO lugar com as fórmulas de precificação.
 * Percentuais de ENTRADA são números "de 0 a 100" (ex.: 6 = 6%).
 * Percentuais de SAÍDA (margem) são frações (0.3 = 30%).
 */

export type StatusPreco = 'saudavel' | 'baixa' | 'prejuizo';

export const MARGEM_MINIMA_SAUDAVEL = 0.1; // abaixo disso = "margem baixa"

export const MSG_INVIAVEL =
  'Os percentuais informados tornam esse preço inviável. Revise seus custos, taxas ou margem.';

export interface PricingInput {
  materiais: number;
  maoDeObra: number;
  embalagem: number;
  outros: number;
  frete: number;
  perdasPct: number;
  custosFixos: number;
  unidadesMes: number;
  impostosPct: number;
  taxasPct: number;
  comissaoPct: number;
  margemPct: number;
}

export type PricingResult =
  | {
      ok: true;
      custoVariavel: number;
      custoFixoRateado: number;
      custoTotal: number;
      precoMinimo: number;
      precoRecomendado: number;
      lucroUnitario: number;
      margem: number;
      faturamentoMensal: number;
      lucroMensal: number;
      status: StatusPreco;
    }
  | { ok: false; erros: string[] };

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function validarPricing(i: PricingInput): string[] {
  const erros: string[] = [];
  const dinheiro: [keyof PricingInput, string][] = [
    ['materiais', 'Materiais/mercadoria'],
    ['maoDeObra', 'Mão de obra'],
    ['embalagem', 'Embalagem'],
    ['outros', 'Outros custos variáveis'],
    ['frete', 'Frete/entrega'],
    ['custosFixos', 'Custos fixos mensais'],
  ];
  for (const [k, nome] of dinheiro) {
    if (!isNum(i[k])) erros.push(`${nome}: informe um número válido.`);
    else if (i[k] < 0) erros.push(`${nome} não pode ser negativo.`);
  }
  const pcts: [keyof PricingInput, string][] = [
    ['perdasPct', 'Desperdício/perdas'],
    ['impostosPct', 'Impostos'],
    ['taxasPct', 'Taxas de venda'],
    ['comissaoPct', 'Comissão'],
    ['margemPct', 'Margem de lucro'],
  ];
  for (const [k, nome] of pcts) {
    if (!isNum(i[k])) erros.push(`${nome}: informe um número válido.`);
    else if (i[k] < 0) erros.push(`${nome} não pode ser negativo.`);
    else if (i[k] > 100) erros.push(`${nome} não pode passar de 100%.`);
  }
  if (!isNum(i.unidadesMes) || i.unidadesMes <= 0) erros.push('Unidades vendidas por mês precisa ser maior que zero.');
  if (erros.length) return erros;

  const encargos = i.impostosPct + i.taxasPct + i.comissaoPct;
  if (encargos + i.margemPct >= 100) erros.push(MSG_INVIAVEL);
  return erros;
}

export function statusPreco(lucroUnitario: number, margem: number): StatusPreco {
  if (lucroUnitario < 0.005) return 'prejuizo'; // menos de meio centavo = sem lucro
  if (margem < MARGEM_MINIMA_SAUDAVEL) return 'baixa';
  return 'saudavel';
}

export function calcularPreco(i: PricingInput): PricingResult {
  const erros = validarPricing(i);
  if (erros.length) return { ok: false, erros };

  const perdas = i.perdasPct / 100;
  const encargos = (i.impostosPct + i.taxasPct + i.comissaoPct) / 100;
  const margem = i.margemPct / 100;

  const custoVariavel = (i.materiais + i.maoDeObra + i.embalagem + i.outros) * (1 + perdas) + i.frete;
  const custoFixoRateado = i.custosFixos / i.unidadesMes;
  const custoTotal = custoVariavel + custoFixoRateado;
  const precoMinimo = custoTotal / (1 - encargos);
  const precoRecomendado = custoTotal / (1 - encargos - margem);
  const lucroUnitario = precoRecomendado * (1 - encargos) - custoTotal;
  const margemReal = precoRecomendado > 0 ? lucroUnitario / precoRecomendado : 0;

  return {
    ok: true,
    custoVariavel,
    custoFixoRateado,
    custoTotal,
    precoMinimo,
    precoRecomendado,
    lucroUnitario,
    margem: margemReal,
    faturamentoMensal: precoRecomendado * i.unidadesMes,
    lucroMensal: lucroUnitario * i.unidadesMes,
    status: statusPreco(lucroUnitario, margemReal),
  };
}

/** Resultado de um produto cujo preço praticado pode diferir do recomendado. */
export function resultadoNoPreco(i: PricingInput, preco: number) {
  const encargos = (i.impostosPct + i.taxasPct + i.comissaoPct) / 100;
  const r = calcularPreco({ ...i, margemPct: 0 });
  if (!r.ok) return null;
  const lucro = preco * (1 - encargos) - r.custoTotal;
  const margem = preco > 0 ? lucro / preco : 0;
  return { lucroUnitario: lucro, margem, status: statusPreco(lucro, margem) };
}

/* ---------------- Ficha técnica ---------------- */

export type Unidade = 'g' | 'kg' | 'ml' | 'l' | 'un';
export const UNIDADES: Unidade[] = ['g', 'kg', 'ml', 'l', 'un'];

const BASE: Record<Unidade, { fam: 'massa' | 'volume' | 'un'; f: number }> = {
  g: { fam: 'massa', f: 1 },
  kg: { fam: 'massa', f: 1000 },
  ml: { fam: 'volume', f: 1 },
  l: { fam: 'volume', f: 1000 },
  un: { fam: 'un', f: 1 },
};

export interface Ingrediente {
  nome: string;
  quantidade: number;
  unidade: Unidade;
  precoCompra: number;
  qtdComprada: number;
  unidadeCompra: Unidade;
}

/** Custo proporcional = (qtd usada / qtd comprada) × preço pago, convertendo unidades. */
export function custoIngrediente(ing: Ingrediente): { custo: number; erro?: string } {
  const usada = BASE[ing.unidade];
  const comprada = BASE[ing.unidadeCompra];
  if (usada.fam !== comprada.fam) return { custo: 0, erro: `Unidade usada (${ing.unidade}) e da compra (${ing.unidadeCompra}) não são compatíveis.` };
  if (!isNum(ing.quantidade) || ing.quantidade < 0) return { custo: 0, erro: 'Quantidade usada inválida.' };
  if (!isNum(ing.precoCompra) || ing.precoCompra < 0) return { custo: 0, erro: 'Preço de compra inválido.' };
  if (!isNum(ing.qtdComprada) || ing.qtdComprada <= 0) return { custo: 0, erro: 'Quantidade comprada precisa ser maior que zero.' };
  const usadaBase = ing.quantidade * usada.f;
  const compradaBase = ing.qtdComprada * comprada.f;
  return { custo: (usadaBase / compradaBase) * ing.precoCompra };
}

export function calcularFicha(ings: Ingrediente[], rendimento: number) {
  const linhas = ings.map(custoIngrediente);
  const erros = linhas.filter((l) => l.erro).map((l) => l.erro as string);
  if (!isNum(rendimento) || rendimento <= 0) erros.push('Rendimento precisa ser maior que zero.');
  const total = linhas.reduce((s, l) => s + l.custo, 0);
  return {
    linhas,
    erros,
    custoTotal: total,
    custoPorUnidade: rendimento > 0 ? total / rendimento : 0,
  };
}

/* ---------------- Promoções ---------------- */

export function calcularPromocao(p: { precoNormal: number; custoUnitario: number; descontoPct: number; taxasPct: number }) {
  const erros: string[] = [];
  if (!(p.precoNormal > 0)) erros.push('O preço normal precisa ser maior que zero.');
  if (!(p.custoUnitario >= 0)) erros.push('O custo não pode ser negativo.');
  if (!(p.descontoPct >= 0 && p.descontoPct <= 100)) erros.push('O desconto precisa estar entre 0% e 100%.');
  if (!(p.taxasPct >= 0 && p.taxasPct < 100)) erros.push('As taxas precisam estar entre 0% e 99,99%.');
  if (erros.length) return { ok: false as const, erros };

  const taxas = p.taxasPct / 100;
  const precoPromo = p.precoNormal * (1 - p.descontoPct / 100);
  const lucroNormal = p.precoNormal * (1 - taxas) - p.custoUnitario;
  const lucroPromo = precoPromo * (1 - taxas) - p.custoUnitario;
  const margemNormal = lucroNormal / p.precoNormal;
  const margemPromo = precoPromo > 0 ? lucroPromo / precoPromo : 0;
  const reducao = lucroNormal > 0 ? 1 - lucroPromo / lucroNormal : lucroPromo < lucroNormal ? 1 : 0;
  let status: 'saudavel' | 'atencao' | 'prejuizo' = 'saudavel';
  if (lucroPromo <= 0) status = 'prejuizo';
  else if (margemPromo < MARGEM_MINIMA_SAUDAVEL) status = 'atencao';
  return {
    ok: true as const,
    precoPromocional: precoPromo,
    valorDesconto: p.precoNormal - precoPromo,
    lucroNormal,
    lucroPromo,
    margemNormal,
    margemPromo,
    reducaoLucro: reducao,
    status,
  };
}

/** Maior desconto que ainda mantém a margem mínima na promoção (fração 0–1). */
export function descontoMaximoSeguro(p: { precoNormal: number; custoUnitario: number; taxasPct: number }, margemMin = MARGEM_MINIMA_SAUDAVEL) {
  const t = p.taxasPct / 100;
  const denom = 1 - t - margemMin;
  if (denom <= 0 || p.precoNormal <= 0) return 0;
  const precoMin = p.custoUnitario / denom;
  return Math.max(0, Math.min(1, 1 - precoMin / p.precoNormal));
}

/* ---------------- Metas ---------------- */

export function calcularMeta(m: { metaFaturamento: number; diasVenda: number; precoMedio: number; custoMedio: number; realizado?: number }) {
  const erros: string[] = [];
  if (!(m.metaFaturamento > 0)) erros.push('A meta de faturamento precisa ser maior que zero.');
  if (!(m.diasVenda > 0) || m.diasVenda > 31) erros.push('Dias de venda precisa estar entre 1 e 31.');
  if (!(m.precoMedio > 0)) erros.push('O preço médio precisa ser maior que zero.');
  if (!(m.custoMedio >= 0)) erros.push('O custo médio não pode ser negativo.');
  if (erros.length) return { ok: false as const, erros };

  const unidadesMes = Math.ceil(m.metaFaturamento / m.precoMedio);
  const realizado = Math.max(0, m.realizado ?? 0);
  return {
    ok: true as const,
    unidadesMes,
    unidadesDia: unidadesMes / m.diasVenda,
    faturamentoDia: m.metaFaturamento / m.diasVenda,
    lucroEstimado: unidadesMes * (m.precoMedio - m.custoMedio),
    progresso: Math.min(1, realizado / m.metaFaturamento),
    falta: Math.max(0, m.metaFaturamento - realizado),
  };
}

export const unidadesParaFaturar = (meta: number, preco: number): number => (preco > 0 ? Math.ceil(meta / preco) : 0);

/* ---------------- Ponto de equilíbrio ---------------- */

export function calcularEquilibrio(e: { custosFixos: number; preco: number; custoVariavel: number }) {
  const erros: string[] = [];
  if (!(e.custosFixos >= 0)) erros.push('Custos fixos não podem ser negativos.');
  if (!(e.preco > 0)) erros.push('O preço de venda precisa ser maior que zero.');
  if (!(e.custoVariavel >= 0)) erros.push('O custo variável não pode ser negativo.');
  if (!erros.length && e.preco - e.custoVariavel <= 0)
    erros.push('O preço está igual ou abaixo do custo variável: cada venda aumenta o prejuízo e o ponto de equilíbrio nunca é atingido.');
  if (erros.length) return { ok: false as const, erros };
  const mc = e.preco - e.custoVariavel;
  const unidades = Math.ceil(e.custosFixos / mc);
  return { ok: true as const, margemContribuicao: mc, unidades, faturamento: unidades * e.preco };
}

/* ---------------- Canais ---------------- */

export function calcularCanal(c: { preco: number; taxaPct: number; comissaoPct: number; custo: number }) {
  const erros: string[] = [];
  if (!(c.preco > 0)) erros.push('Informe o preço do canal.');
  if (!(c.custo >= 0)) erros.push('O custo não pode ser negativo.');
  if (!(c.taxaPct >= 0 && c.comissaoPct >= 0 && c.taxaPct + c.comissaoPct < 100)) erros.push('Taxa + comissão precisam somar menos de 100%.');
  if (erros.length) return { ok: false as const, erros, lucro: 0, margem: 0 };
  const lucro = c.preco * (1 - (c.taxaPct + c.comissaoPct) / 100) - c.custo;
  return { ok: true as const, erros: [] as string[], lucro, margem: lucro / c.preco };
}

/* ---------------- Markup ---------------- */

export function calcularMarkup(m: { custo: number; despesasPct: number; impostosPct: number; taxasPct: number; margemPct: number }) {
  const erros: string[] = [];
  if (!(m.custo > 0)) erros.push('Informe o custo do produto.');
  for (const [k, v] of Object.entries({ Despesas: m.despesasPct, Impostos: m.impostosPct, Taxas: m.taxasPct, Margem: m.margemPct }))
    if (!(v >= 0 && v <= 100)) erros.push(`${k} precisa estar entre 0% e 100%.`);
  if (erros.length) return { ok: false as const, erros };
  const soma = (m.despesasPct + m.impostosPct + m.taxasPct + m.margemPct) / 100;
  if (soma >= 1) return { ok: false as const, erros: [MSG_INVIAVEL] };
  const markup = 1 / (1 - soma);
  const preco = m.custo * markup;
  return {
    ok: true as const,
    markup,
    markupPct: markup - 1,
    preco,
    lucro: preco * (m.margemPct / 100),
    margemSobreVenda: m.margemPct / 100,
  };
}

/* ---------------- Análise gerencial ---------------- */

export type Tom = 'ok' | 'alerta' | 'perigo';

export function gerarAnalise(r: Extract<PricingResult, { ok: true }>, metaFaturamento = 5000): { texto: string; tom: Tom }[] {
  const f = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const out: { texto: string; tom: Tom }[] = [
    { texto: `Seu custo total é ${f(r.custoTotal)} e seu preço recomendado é ${f(r.precoRecomendado)}.`, tom: 'ok' },
    { texto: `Com esse preço, seu lucro estimado é de ${f(r.lucroUnitario)} por unidade.`, tom: 'ok' },
    {
      texto: `Para atingir ${f(metaFaturamento)} de faturamento, você precisaria vender aproximadamente ${unidadesParaFaturar(metaFaturamento, r.precoRecomendado)} unidades.`,
      tom: 'ok',
    },
  ];
  if (r.status === 'prejuizo') out.push({ texto: '⚠️ Com esses valores você terminaria no prejuízo. Revise seus custos ou o preço.', tom: 'perigo' });
  else if (r.status === 'baixa') out.push({ texto: '⚠️ Sua margem está baixa. Considere revisar seus custos ou preço.', tom: 'alerta' });
  else out.push({ texto: '✅ Seu preço apresenta uma margem saudável dentro dos parâmetros informados.', tom: 'ok' });
  return out;
}
