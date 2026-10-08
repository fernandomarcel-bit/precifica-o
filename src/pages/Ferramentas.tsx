import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Aviso, Button, Dica, NumField, PageHeader, ProGate, SelectField } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { useToast } from '../hooks/useToast';
import { saveChannels } from '../services/api';
import { mensagemErro } from '../services/supabase';
import { brl, int, num, pctFmt, toInput } from '../utils/format';
import { calcularCanal, calcularEquilibrio, calcularMarkup } from '../utils/pricing';

function SeletorProduto({ valor, onChange }: { valor: string; onChange: (id: string) => void }) {
  const { produtos } = useProducts();
  return (
    <SelectField label="Usar dados de um produto (opcional)" value={valor} onChange={(e) => onChange(e.target.value)} hint="Preenche os campos automaticamente.">
      <option value="">— Preencher manualmente —</option>
      {produtos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </SelectField>
  );
}

/* ---------------- Ponto de equilíbrio ---------------- */
export function Equilibrio() {
  const { can } = useAuth();
  const { produtos } = useProducts();
  const [sp] = useSearchParams();
  const [pid, setPid] = useState(sp.get('produto') ?? '');
  const [fixos, setFixos] = useState('');
  const [preco, setPreco] = useState('');
  const [cv, setCv] = useState('');

  useEffect(() => {
    const p = produtos.find((x) => x.id === pid);
    if (p) { setFixos(toInput(Number(p.custos_fixos))); setPreco(toInput(Number(Number(p.preco_recomendado).toFixed(2)))); setCv(toInput(Number(Number(p.custo_variavel).toFixed(2)))); }
  }, [pid, produtos]);

  const r = calcularEquilibrio({ custosFixos: num(fixos), preco: num(preco), custoVariavel: num(cv) });
  return (
    <div>
      <PageHeader titulo="Ponto de equilíbrio" subtitulo="Quanto você precisa vender para não ter prejuízo." />
      <ProGate liberado={can('equilibrio')} nome="Ponto de equilíbrio">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4">
            <SeletorProduto valor={pid} onChange={setPid} />
            <NumField label="Custos fixos do mês" prefixo="R$" value={fixos} onChange={(e) => setFixos(e.target.value)} hint="O que você paga todo mês, venda ou não." />
            <NumField label="Preço de venda" prefixo="R$" value={preco} onChange={(e) => setPreco(e.target.value)} />
            <NumField label="Custo variável por unidade" prefixo="R$" value={cv} onChange={(e) => setCv(e.target.value)} hint="Materiais, mão de obra, embalagem e frete de 1 unidade." />
          </div>
          <div className="space-y-4">
            {!r.ok ? (num(preco) || num(fixos) ? <Aviso tom="alerta"><ul>{r.erros.map((e) => <li key={e}>{e}</li>)}</ul></Aviso> : <div className="card text-gray-600">Preencha os campos para ver o resultado.</div>) : (
              <div className="pop space-y-4">
                <div className="rounded-card bg-gradient-to-br from-rosa-escuro via-rosa to-roxo p-6 text-white shadow-suave">
                  <p className="text-sm font-bold opacity-90">UNIDADES PARA O EQUILÍBRIO</p>
                  <p className="text-5xl font-extrabold">{int(r.unidades)}</p>
                  <p className="mt-2 opacity-95">Você precisa vender {int(r.unidades)} unidades para cobrir seus custos.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="card !p-4"><p className="text-xs font-semibold text-gray-600">Faturamento para equilíbrio</p><p className="text-xl font-extrabold">{brl(r.faturamento)}</p></div>
                  <div className="card !p-4"><p className="text-xs font-semibold text-gray-600">Sobra por venda</p><p className="text-xl font-extrabold">{brl(r.margemContribuicao)}</p></div>
                </div>
                <Dica>“Sobra por venda” é quanto cada unidade vendida ajuda a pagar seus custos fixos. O nome técnico é <b>margem de contribuição</b>.</Dica>
              </div>
            )}
          </div>
        </div>
      </ProGate>
    </div>
  );
}

/* ---------------- Canais de venda ---------------- */
const CANAIS = ['Venda direta', 'WhatsApp', 'Instagram', 'iFood', 'Marketplace', 'Atacado', 'Outro'];
interface LinhaCanal { usar: boolean; preco: string; taxa: string; comissao: string; custo: string }

export function Canais() {
  const { can } = useAuth();
  const { produtos } = useProducts();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [pid, setPid] = useState(sp.get('produto') ?? '');
  const [salvando, setSalvando] = useState(false);
  const [linhas, setLinhas] = useState<LinhaCanal[]>(() => CANAIS.map((_, i) => ({ usar: i < 3, preco: '', taxa: '', comissao: '', custo: '' })));

  useEffect(() => {
    const p = produtos.find((x) => x.id === pid);
    if (p) setLinhas((s) => s.map((l) => ({ ...l, preco: toInput(Number(Number(p.preco_recomendado).toFixed(2))), custo: toInput(Number(Number(p.custo_total).toFixed(2))) })));
  }, [pid, produtos]);

  const alt = (i: number, patch: Partial<LinhaCanal>) => setLinhas((s) => s.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const calc = useMemo(() => linhas.map((l, i) => ({ canal: CANAIS[i], l, r: calcularCanal({ preco: num(l.preco), taxaPct: num(l.taxa), comissaoPct: num(l.comissao), custo: num(l.custo) }) })), [linhas]);
  const ranking = calc.filter((c) => c.l.usar && c.r.ok).sort((a, b) => b.r.lucro - a.r.lucro);
  const medalha = ['🥇', '🥈', '🥉'];

  const salvar = async () => {
    setSalvando(true);
    try {
      await saveChannels(pid, ranking.map((c) => ({ canal: c.canal, preco: num(c.l.preco), taxa_pct: num(c.l.taxa), comissao_pct: num(c.l.comissao), custo: num(c.l.custo), lucro_liquido: c.r.lucro, margem: c.r.margem })));
      toast.ok('Comparação salva no produto.');
    } catch (e) { toast.erro(mensagemErro(e)); }
    setSalvando(false);
  };

  return (
    <div>
      <PageHeader titulo="Comparador de canais" subtitulo="Descubra onde a mesma venda deixa mais lucro no seu bolso." />
      <ProGate liberado={can('canais')} nome="Canais de venda">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="card"><SeletorProduto valor={pid} onChange={setPid} /></div>
            {linhas.map((l, i) => (
              <div key={CANAIS[i]} className="card space-y-3">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 font-extrabold">
                  <input type="checkbox" className="h-5 w-5 accent-roxo" checked={l.usar} onChange={(e) => alt(i, { usar: e.target.checked })} />{CANAIS[i]}
                </label>
                {l.usar && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <NumField label="Preço" prefixo="R$" value={l.preco} onChange={(e) => alt(i, { preco: e.target.value })} />
                    <NumField label="Taxa" sufixo="%" value={l.taxa} onChange={(e) => alt(i, { taxa: e.target.value })} />
                    <NumField label="Comissão" sufixo="%" value={l.comissao} onChange={(e) => alt(i, { comissao: e.target.value })} />
                    <NumField label="Custo" prefixo="R$" value={l.custo} onChange={(e) => alt(i, { custo: e.target.value })} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <h2 className="text-xl font-extrabold">Ranking de lucro</h2>
            {ranking.length === 0 ? <div className="card text-gray-600">Marque os canais e preencha preço e custo para ver o ranking.</div> : (
              <ol className="space-y-3">
                {ranking.map((c, i) => (
                  <li key={c.canal} className={`card flex items-center justify-between gap-3 ${i === 0 ? 'ring-2 ring-roxo' : ''}`}>
                    <div><p className="font-extrabold">{medalha[i] ?? `${i + 1}º`} {c.canal}</p><p className="text-sm text-gray-600">Margem {pctFmt(c.r.margem)}</p></div>
                    <p className={`text-xl font-extrabold ${c.r.lucro > 0 ? 'text-ok' : 'text-perigo'}`}>{brl(c.r.lucro)}</p>
                  </li>
                ))}
              </ol>
            )}
            {calc.filter((c) => c.l.usar && !c.r.ok && (num(c.l.preco) > 0)).map((c) => <Aviso key={c.canal} tom="alerta"><b>{c.canal}:</b> {c.r.erros[0]}</Aviso>)}
            {ranking.length > 0 && <Button className="w-full" disabled={!pid} carregando={salvando} onClick={() => void salvar()}>SALVAR NO PRODUTO</Button>}
            {ranking.length > 0 && !pid && <p className="text-xs text-gray-600">Escolha um produto acima para salvar a comparação.</p>}
          </div>
        </div>
      </ProGate>
    </div>
  );
}

/* ---------------- Markup ---------------- */
export function Markup() {
  const [custo, setCusto] = useState('');
  const [desp, setDesp] = useState('');
  const [imp, setImp] = useState('');
  const [taxas, setTaxas] = useState('');
  const [margem, setMargem] = useState('30');
  const r = calcularMarkup({ custo: num(custo), despesasPct: num(desp), impostosPct: num(imp), taxasPct: num(taxas), margemPct: num(margem) });

  return (
    <div>
      <PageHeader titulo="Simulador de markup" subtitulo="Markup é um multiplicador utilizado para formar preço a partir do custo." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <NumField label="Custo do produto" prefixo="R$" value={custo} onChange={(e) => setCusto(e.target.value)} hint="Quanto custa produzir ou comprar 1 unidade." />
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Despesas" sufixo="%" value={desp} onChange={(e) => setDesp(e.target.value)} hint="Despesas como % da venda." />
            <NumField label="Impostos" sufixo="%" value={imp} onChange={(e) => setImp(e.target.value)} />
            <NumField label="Taxas" sufixo="%" value={taxas} onChange={(e) => setTaxas(e.target.value)} />
            <NumField label="Margem" sufixo="%" value={margem} onChange={(e) => setMargem(e.target.value)} hint="Lucro desejado sobre o preço." />
          </div>
        </div>
        <div className="space-y-4">
          {!r.ok ? (num(custo) ? <Aviso tom="alerta"><ul>{r.erros.map((e) => <li key={e}>{e}</li>)}</ul></Aviso> : <div className="card text-gray-600">Informe o custo para calcular.</div>) : (
            <div className="pop space-y-4">
              <div className="rounded-card bg-gradient-to-br from-rosa-escuro via-rosa to-roxo p-6 text-white shadow-suave">
                <p className="text-sm font-bold opacity-90">MARKUP (MULTIPLICADOR)</p>
                <p className="text-5xl font-extrabold">×{r.markup.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</p>
                <p className="mt-1 opacity-95">Preço de venda: {brl(r.preco)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="card !p-4"><p className="text-xs font-semibold text-gray-600">Lucro por unidade</p><p className="text-xl font-extrabold">{brl(r.lucro)}</p></div>
                <div className="card !p-4"><p className="text-xs font-semibold text-gray-600">Markup em %</p><p className="text-xl font-extrabold">{pctFmt(r.markupPct)}</p></div>
              </div>
              <div className="card space-y-3">
                <p className="text-lg font-extrabold">MARGEM ≠ MARKUP</p>
                <Barra rotulo="Margem" detalhe="lucro dividido pelo PREÇO" valor={r.margemSobreVenda} cor="bg-roxo" />
                <Barra rotulo="Markup" detalhe="acréscimo dividido pelo CUSTO" valor={Math.min(1, r.markupPct)} texto={pctFmt(r.markupPct)} cor="bg-rosa" />
                <p className="text-sm text-gray-600">Com margem de {pctFmt(r.margemSobreVenda, 0)}, o markup é de {pctFmt(r.markupPct, 0)}. São contas diferentes: confundir as duas é um erro comum que faz muita gente vender com menos lucro do que imagina.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Barra({ rotulo, detalhe, valor, texto, cor }: { rotulo: string; detalhe: string; valor: number; texto?: string; cor: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="font-bold">{rotulo} <span className="font-normal text-gray-600">({detalhe})</span></span><b>{texto ?? pctFmt(valor)}</b></div>
      <div className="h-3 overflow-hidden rounded-full bg-lilas"><div className={`barra h-full rounded-full ${cor}`} style={{ width: `${Math.max(2, valor * 100)}%` }} /></div>
    </div>
  );
}
