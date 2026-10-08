import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Aviso, Button, Dica, Field, NumField } from './ui';
import ResultadoPreco from './ResultadoPreco';
import { calcularPreco, type PricingInput } from '../utils/pricing';
import { num, toInput } from '../utils/format';
import { rowToInput } from '../utils/mappers';
import type { Product } from '../types';

export interface FormMeta { name: string; category: string }
interface Props {
  produto?: Product;
  prefill?: Partial<{ nome: string; categoria: string; materiais: number }>;
  salvando?: boolean;
  onSalvar: (input: PricingInput, meta: FormMeta) => void;
}

const ETAPAS = ['Produto', 'Custos', 'Custos fixos', 'Taxas', 'Lucro'];

export default function PricingForm({ produto, prefill, salvando, onSalvar }: Props) {
  const ini = produto ? rowToInput(produto) : null;
  const [etapa, setEtapa] = useState(0);
  const [tocou, setTocou] = useState(!!produto);
  const [f, setF] = useState({
    nome: produto?.name ?? prefill?.nome ?? '',
    categoria: produto?.category ?? prefill?.categoria ?? '',
    materiais: toInput(ini?.materiais ?? prefill?.materiais ?? null),
    maoDeObra: toInput(ini?.maoDeObra ?? null),
    embalagem: toInput(ini?.embalagem ?? null),
    outros: toInput(ini?.outros ?? null),
    frete: toInput(ini?.frete ?? null),
    perdas: toInput(ini?.perdasPct ?? null),
    custosFixos: toInput(ini?.custosFixos ?? null),
    unidades: toInput(ini?.unidadesMes ?? null),
    impostos: toInput(ini?.impostosPct ?? null),
    taxas: toInput(ini?.taxasPct ?? null),
    comissao: toInput(ini?.comissaoPct ?? null),
    margem: toInput(ini?.margemPct ?? 30),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setTocou(true); setF((s) => ({ ...s, [k]: e.target.value })); };

  const input: PricingInput = useMemo(() => ({
    materiais: num(f.materiais), maoDeObra: num(f.maoDeObra), embalagem: num(f.embalagem), outros: num(f.outros), frete: num(f.frete),
    perdasPct: num(f.perdas), custosFixos: num(f.custosFixos), unidadesMes: num(f.unidades),
    impostosPct: num(f.impostos), taxasPct: num(f.taxas), comissaoPct: num(f.comissao), margemPct: num(f.margem),
  }), [f]);
  const r = useMemo(() => calcularPreco(input), [input]);
  const nomeOk = f.nome.trim().length > 0;

  const passo = [
    <div key="0" className="space-y-4">
      <Field label="Nome do produto" value={f.nome} onChange={set('nome')} placeholder="Ex.: Brigadeiro gourmet" maxLength={120} hint="Como você chama esse produto." />
      <Field label="Categoria" value={f.categoria} onChange={set('categoria')} placeholder="Ex.: Doces" maxLength={60} hint="Opcional. Ajuda a organizar seus relatórios." />
    </div>,
    <div key="1" className="grid gap-4 sm:grid-cols-2">
      <NumField label="Materiais / mercadoria" prefixo="R$" value={f.materiais} onChange={set('materiais')} hint="Quanto você gasta de ingredientes ou mercadoria para fazer 1 unidade." />
      <NumField label="Mão de obra por unidade" prefixo="R$" value={f.maoDeObra} onChange={set('maoDeObra')} hint="Quanto vale o seu tempo (ou de quem ajuda) em cada unidade." />
      <NumField label="Embalagem" prefixo="R$" value={f.embalagem} onChange={set('embalagem')} hint="Caixa, pote, etiqueta, sacola…" />
      <NumField label="Outros custos variáveis" prefixo="R$" value={f.outros} onChange={set('outros')} hint="Gás, energia, qualquer custo que cresce com a venda." />
      <NumField label="Frete / entrega por unidade" prefixo="R$" value={f.frete} onChange={set('frete')} hint="Quanto você paga de entrega por unidade vendida." />
      <NumField label="Desperdício / perdas" sufixo="%" value={f.perdas} onChange={set('perdas')} hint="Parte que estraga, queima ou sobra. Ex.: 5." />
    </div>,
    <div key="2" className="grid gap-4 sm:grid-cols-2">
      <NumField label="Custos fixos mensais" prefixo="R$" value={f.custosFixos} onChange={set('custosFixos')} hint="Aluguel, internet, MEI, pró-labore… o que você paga todo mês, venda ou não." />
      <NumField label="Unidades vendidas por mês" value={f.unidades} onChange={set('unidades')} hint="Quantas unidades deste produto você vende (ou quer vender) por mês." />
      <div className="sm:col-span-2"><Dica>Dividimos seus custos fixos pelas unidades vendidas para que cada venda ajude a pagá-los.</Dica></div>
    </div>,
    <div key="3" className="grid gap-4 sm:grid-cols-3">
      <NumField label="Impostos" sufixo="%" value={f.impostos} onChange={set('impostos')} hint="Ex.: DAS do MEI. Se não sabe, pergunte ao seu contador." />
      <NumField label="Taxas de venda" sufixo="%" value={f.taxas} onChange={set('taxas')} hint="Maquininha, PIX, plataforma." />
      <NumField label="Comissão" sufixo="%" value={f.comissao} onChange={set('comissao')} hint="Quanto vai para vendedor ou aplicativo." />
    </div>,
    <div key="4" className="space-y-4">
      <NumField label="Margem de lucro desejada" sufixo="%" value={f.margem} onChange={set('margem')} hint="Quanto de cada venda você quer que sobre de lucro limpo, depois de tudo pago." />
      <Dica>Margem é a parte do PREÇO que vira lucro. Uma margem de 30% significa R$ 30 de lucro a cada R$ 100 vendidos.</Dica>
    </div>,
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="card">
        <ol className="mb-5 flex gap-1.5" aria-label="Etapas">
          {ETAPAS.map((n, i) => (
            <li key={n} className="flex-1">
              <button type="button" onClick={() => setEtapa(i)} aria-current={i === etapa ? 'step' : undefined} className="block w-full text-left">
                <span className={`block h-1.5 rounded-full barra ${i <= etapa ? 'bg-roxo' : 'bg-gray-200'}`} />
                <span className={`mt-1 hidden text-[11px] font-bold sm:block ${i === etapa ? 'text-roxo' : 'text-gray-500'}`}>{n}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mb-4 text-sm font-bold text-roxo sm:hidden">Etapa {etapa + 1} de 5 · {ETAPAS[etapa]}</p>
        {passo[etapa]}
        <div className="mt-6 flex gap-3">
          {etapa > 0 && <Button variante="ghost" onClick={() => setEtapa(etapa - 1)}><ChevronLeft className="h-4 w-4" />Voltar</Button>}
          {etapa < 4 && <Button variante="roxo" className="flex-1" onClick={() => setEtapa(etapa + 1)}>Próxima etapa<ChevronRight className="h-4 w-4" /></Button>}
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        {r.ok ? (
          <ResultadoPreco r={r} />
        ) : tocou ? (
          <Aviso tom="alerta"><ul className="space-y-1">{r.erros.map((e) => <li key={e}>{e}</li>)}</ul></Aviso>
        ) : (
          <div className="card text-center text-gray-600">Preencha os custos e veja aqui, em tempo real, quanto você deve cobrar.</div>
        )}
        <Button className="w-full" disabled={!r.ok || !nomeOk} carregando={salvando} onClick={() => onSalvar(input, { name: f.nome, category: f.categoria })}>
          {produto ? 'SALVAR ALTERAÇÕES' : 'SALVAR PRODUTO'}
        </Button>
        {!nomeOk && r.ok && <p className="text-center text-xs text-gray-600">Dê um nome ao produto na etapa 1 para salvar.</p>}
      </div>
    </div>
  );
}
