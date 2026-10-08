import { describe, expect, it } from 'vitest';
import {
  MSG_INVIAVEL, calcularCanal, calcularEquilibrio, calcularFicha, calcularMarkup, calcularMeta,
  calcularPreco, calcularPromocao, custoIngrediente, descontoMaximoSeguro, type PricingInput,
} from './pricing';

const base: PricingInput = {
  materiais: 10, maoDeObra: 5, embalagem: 2, outros: 1, frete: 0, perdasPct: 0,
  custosFixos: 1500, unidadesMes: 200, impostosPct: 6, taxasPct: 3, comissaoPct: 0, margemPct: 30,
};

describe('calcularPreco — exemplo oficial do prompt (e da planilha)', () => {
  const r = calcularPreco(base);
  if (!r.ok) throw new Error('deveria ser ok');
  it('custo variável = 18', () => expect(r.custoVariavel).toBeCloseTo(18, 6));
  it('rateio fixo = 7,50', () => expect(r.custoFixoRateado).toBeCloseTo(7.5, 6));
  it('custo total = 25,50', () => expect(r.custoTotal).toBeCloseTo(25.5, 6));
  it('preço mínimo ≈ 28,02', () => expect(r.precoMinimo).toBeCloseTo(28.021978, 5));
  it('preço recomendado ≈ 41,80', () => expect(r.precoRecomendado).toBeCloseTo(41.80328, 4));
  it('lucro por unidade ≈ 12,54', () => expect(r.lucroUnitario).toBeCloseTo(12.54098, 4));
  it('margem = 30%', () => expect(r.margem).toBeCloseTo(0.3, 8));
  it('faturamento e lucro mensais', () => {
    expect(r.faturamentoMensal).toBeCloseTo(8360.6557, 3);
    expect(r.lucroMensal).toBeCloseTo(2508.1967, 3);
  });
  it('status saudável', () => expect(r.status).toBe('saudavel'));
});

describe('perdas e frete', () => {
  it('perdas incidem só sobre custos variáveis; frete entra depois', () => {
    const r = calcularPreco({ ...base, perdasPct: 10, frete: 2 });
    if (!r.ok) throw new Error();
    expect(r.custoVariavel).toBeCloseTo(18 * 1.1 + 2, 8);
  });
});

describe('validações', () => {
  it('impostos+taxas+comissão+margem >= 100 → inviável com mensagem', () => {
    const r = calcularPreco({ ...base, impostosPct: 40, taxasPct: 20, comissaoPct: 10, margemPct: 30 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros).toContain(MSG_INVIAVEL);
  });
  it('unidades zero bloqueia', () => expect(calcularPreco({ ...base, unidadesMes: 0 }).ok).toBe(false));
  it('percentual negativo bloqueia', () => expect(calcularPreco({ ...base, taxasPct: -1 }).ok).toBe(false));
  it('margem > 100 bloqueia', () => expect(calcularPreco({ ...base, margemPct: 120 }).ok).toBe(false));
  it('custo negativo bloqueia', () => expect(calcularPreco({ ...base, materiais: -5 }).ok).toBe(false));
  it('NaN bloqueia', () => expect(calcularPreco({ ...base, materiais: NaN }).ok).toBe(false));
  it('margem 0 → sem lucro', () => {
    const r = calcularPreco({ ...base, margemPct: 0 });
    if (!r.ok) throw new Error();
    expect(r.status).toBe('prejuizo');
  });
  it('margem 5% → margem baixa', () => {
    const r = calcularPreco({ ...base, margemPct: 5 });
    if (!r.ok) throw new Error();
    expect(r.status).toBe('baixa');
  });
});

describe('ficha técnica', () => {
  it('leite 1 L comprado em 1 L por 4,50 → 4,50', () =>
    expect(custoIngrediente({ nome: 'Leite', quantidade: 1, unidade: 'l', precoCompra: 4.5, qtdComprada: 1, unidadeCompra: 'l' }).custo).toBeCloseTo(4.5));
  it('converte g ↔ kg', () =>
    expect(custoIngrediente({ nome: 'Farinha', quantidade: 500, unidade: 'g', precoCompra: 6, qtdComprada: 1, unidadeCompra: 'kg' }).custo).toBeCloseTo(3));
  it('Nutella 150 g de pote de 650 g a 18,90', () =>
    expect(custoIngrediente({ nome: 'Nutella', quantidade: 150, unidade: 'g', precoCompra: 18.9, qtdComprada: 650, unidadeCompra: 'g' }).custo).toBeCloseTo(4.3615, 3));
  it('unidades incompatíveis geram erro', () =>
    expect(custoIngrediente({ nome: 'x', quantidade: 1, unidade: 'g', precoCompra: 1, qtdComprada: 1, unidadeCompra: 'ml' }).erro).toBeTruthy());
  it('total e custo por unidade', () => {
    const f = calcularFicha(
      [
        { nome: 'Leite', quantidade: 1, unidade: 'l', precoCompra: 4.5, qtdComprada: 1, unidadeCompra: 'l' },
        { nome: 'Leite condensado', quantidade: 395, unidade: 'g', precoCompra: 5.9, qtdComprada: 395, unidadeCompra: 'g' },
      ],
      10
    );
    expect(f.custoTotal).toBeCloseTo(10.4);
    expect(f.custoPorUnidade).toBeCloseTo(1.04);
  });
  it('rendimento zero gera erro', () => expect(calcularFicha([], 0).erros.length).toBeGreaterThan(0));
});

describe('promoções (valores da planilha)', () => {
  it('10 de preço, 5 de custo, 10% desc, 9% taxas', () => {
    const r = calcularPromocao({ precoNormal: 10, custoUnitario: 5, descontoPct: 10, taxasPct: 9 });
    if (!r.ok) throw new Error();
    expect(r.precoPromocional).toBeCloseTo(9);
    expect(r.lucroPromo).toBeCloseTo(3.19);
    expect(r.margemPromo).toBeCloseTo(0.354444, 5);
    expect(r.lucroNormal).toBeCloseTo(4.1);
    expect(r.reducaoLucro).toBeCloseTo(1 - 3.19 / 4.1, 6);
    expect(r.status).toBe('saudavel');
  });
  it('desconto que gera prejuízo', () => {
    const r = calcularPromocao({ precoNormal: 10, custoUnitario: 5, descontoPct: 60, taxasPct: 9 });
    if (!r.ok) throw new Error();
    expect(r.status).toBe('prejuizo');
  });
  it('desconto máximo seguro mantém 10% de margem', () => {
    const d = descontoMaximoSeguro({ precoNormal: 10, custoUnitario: 5, taxasPct: 9 });
    const r = calcularPromocao({ precoNormal: 10, custoUnitario: 5, descontoPct: d * 100, taxasPct: 9 });
    if (!r.ok) throw new Error();
    expect(r.margemPromo).toBeCloseTo(0.1, 4);
  });
});

describe('metas (valores da planilha)', () => {
  it('10.000 / 26 dias / preço 10 / custo 5', () => {
    const r = calcularMeta({ metaFaturamento: 10000, diasVenda: 26, precoMedio: 10, custoMedio: 5, realizado: 8000 });
    if (!r.ok) throw new Error();
    expect(r.unidadesMes).toBe(1000);
    expect(r.unidadesDia).toBeCloseTo(38.4615, 3);
    expect(r.faturamentoDia).toBeCloseTo(384.6154, 3);
    expect(r.lucroEstimado).toBe(5000);
    expect(r.progresso).toBeCloseTo(0.8);
    expect(r.falta).toBe(2000);
  });
  it('preço médio zero bloqueia', () => expect(calcularMeta({ metaFaturamento: 1, diasVenda: 1, precoMedio: 0, custoMedio: 0 }).ok).toBe(false));
});

describe('ponto de equilíbrio (valores da planilha)', () => {
  it('1500 fixos, preço 10, variável 5 → 300 un / R$ 3.000', () => {
    const r = calcularEquilibrio({ custosFixos: 1500, preco: 10, custoVariavel: 5 });
    if (!r.ok) throw new Error();
    expect(r.margemContribuicao).toBe(5);
    expect(r.unidades).toBe(300);
    expect(r.faturamento).toBe(3000);
  });
  it('preço <= custo variável explica o problema', () => expect(calcularEquilibrio({ custosFixos: 1, preco: 5, custoVariavel: 5 }).ok).toBe(false));
});

describe('canais (valores da planilha)', () => {
  it('10, taxa 9%, custo 5 → 4,10 / 41%', () => {
    const r = calcularCanal({ preco: 10, taxaPct: 9, comissaoPct: 0, custo: 5 });
    expect(r.lucro).toBeCloseTo(4.1);
    expect(r.margem).toBeCloseTo(0.41);
  });
});

describe('markup', () => {
  it('margem ≠ markup: 30% de margem com 9% de encargos', () => {
    const r = calcularMarkup({ custo: 25.5, despesasPct: 0, impostosPct: 6, taxasPct: 3, margemPct: 30 });
    if (!r.ok) throw new Error();
    expect(r.preco).toBeCloseTo(41.80328, 4);
    expect(r.markup).toBeCloseTo(1.63934, 4);
    expect(r.markupPct).toBeCloseTo(0.63934, 4);
  });
  it('soma >= 100% é inviável', () => expect(calcularMarkup({ custo: 1, despesasPct: 50, impostosPct: 20, taxasPct: 20, margemPct: 10 }).ok).toBe(false));
});
