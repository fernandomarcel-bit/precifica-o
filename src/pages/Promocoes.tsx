import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Aviso, Button, Field, NumField, PageHeader, ProGate, SelectField, Vazio } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { useToast } from '../hooks/useToast';
import { deletePromotion, listPromotions, savePromotion } from '../services/api';
import { mensagemErro } from '../services/supabase';
import { brl, num, pctFmt, toInput } from '../utils/format';
import { calcularPromocao, descontoMaximoSeguro } from '../utils/pricing';
import type { Promotion } from '../types';

const ST = {
  saudavel: { t: '🟢 PROMOÇÃO SAUDÁVEL', c: 'bg-green-50 text-ok' },
  atencao: { t: '🟡 ATENÇÃO À MARGEM', c: 'bg-amber-50 text-amber-700' },
  prejuizo: { t: '🔴 RISCO DE PREJUÍZO', c: 'bg-red-50 text-perigo' },
} as const;

export default function Promocoes() {
  const { can } = useAuth();
  const { produtos } = useProducts();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [produtoId, setProdutoId] = useState(sp.get('produto') ?? '');
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [desc, setDesc] = useState('10');
  const [taxas, setTaxas] = useState('');
  const [salvas, setSalvas] = useState<Promotion[]>([]);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => listPromotions().then(setSalvas).catch(() => setSalvas([]));
  useEffect(() => { void carregar(); }, []);

  useEffect(() => {
    const p = produtos.find((x) => x.id === produtoId);
    if (p) { setPreco(toInput(Number(Number(p.preco_recomendado).toFixed(2))) ); setCusto(toInput(Number(Number(p.custo_total).toFixed(2)))); setTaxas(toInput(Number(p.taxas_pct) + Number(p.impostos_pct) + Number(p.comissao_pct))); setNome(`Promoção ${p.name}`); }
  }, [produtoId, produtos]);

  const entrada = { precoNormal: num(preco), custoUnitario: num(custo), descontoPct: num(desc), taxasPct: num(taxas) };
  const r = useMemo(() => calcularPromocao(entrada), [preco, custo, desc, taxas]); // eslint-disable-line
  const maxSeguro = useMemo(() => descontoMaximoSeguro(entrada), [preco, custo, taxas]); // eslint-disable-line

  const salvar = async () => {
    if (!r.ok) return;
    setSalvando(true);
    try {
      await savePromotion({ product_id: produtoId || null, nome: nome.trim() || 'Promoção', preco_normal: entrada.precoNormal, custo_unitario: entrada.custoUnitario, desconto_pct: entrada.descontoPct, taxas_pct: entrada.taxasPct, preco_promocional: r.precoPromocional, lucro_normal: r.lucroNormal, lucro_promocional: r.lucroPromo, margem_promocional: r.margemPromo, status: r.status });
      toast.ok('Promoção salva.'); await carregar();
    } catch (e) { toast.erro(mensagemErro(e)); }
    setSalvando(false);
  };

  return (
    <div>
      <PageHeader titulo="Calculadora de promoções" subtitulo="Veja quanto um desconto reduz o seu lucro antes de anunciar." />
      <ProGate liberado={can('promocoes')} nome="Promoções">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4">
            <SelectField label="Usar dados de um produto (opcional)" value={produtoId} onChange={(e) => setProdutoId(e.target.value)} hint="Preenche preço, custo e taxas automaticamente.">
              <option value="">— Preencher manualmente —</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectField>
            <Field label="Nome da promoção" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Ex.: Páscoa 15% off" />
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Preço normal" prefixo="R$" value={preco} onChange={(e) => setPreco(e.target.value)} />
              <NumField label="Custo unitário" prefixo="R$" value={custo} onChange={(e) => setCusto(e.target.value)} />
              <NumField label="Desconto" sufixo="%" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <NumField label="Taxas" sufixo="%" value={taxas} onChange={(e) => setTaxas(e.target.value)} hint="Impostos, maquininha, comissão." />
            </div>
          </div>

          <div className="space-y-4">
            {!r.ok ? <Aviso tom="alerta"><ul>{r.erros.map((e) => <li key={e}>{e}</li>)}</ul></Aviso> : (
              <div className="pop space-y-4">
                <div className={`rounded-card p-5 text-center text-lg font-extrabold ${ST[r.status].c}`}>{ST[r.status].t}</div>
                <div className="grid grid-cols-2 gap-3">
                  <Box a="Preço promocional" b={brl(r.precoPromocional)} destaque />
                  <Box a="Valor do desconto" b={brl(r.valorDesconto)} />
                  <Box a="Lucro após taxas" b={brl(r.lucroPromo)} />
                  <Box a="Margem restante" b={pctFmt(r.margemPromo)} />
                </div>
                <div className="card grid grid-cols-2 gap-4 text-sm">
                  <div><p className="font-bold text-gray-600">Preço normal</p><p className="text-lg font-extrabold">{brl(entrada.precoNormal)}</p><p>Lucro normal {brl(r.lucroNormal)}</p></div>
                  <div><p className="font-bold text-gray-600">Preço promocional</p><p className="text-lg font-extrabold text-rosa-escuro">{brl(r.precoPromocional)}</p><p>Lucro promocional {brl(r.lucroPromo)}</p></div>
                </div>
                <Aviso tom={r.status === 'saudavel' ? 'info' : r.status === 'atencao' ? 'alerta' : 'perigo'}>Seu desconto reduziu seu lucro em {pctFmt(Math.min(1, Math.max(0, r.reducaoLucro)), 0)}.{maxSeguro > 0 && <> Para manter pelo menos 10% de margem, o desconto máximo é de {pctFmt(maxSeguro, 0)}.</>}</Aviso>
                <Button className="w-full" carregando={salvando} onClick={() => void salvar()}>SALVAR PROMOÇÃO</Button>
              </div>
            )}
          </div>
        </div>

        <h2 className="mb-3 mt-10 text-xl font-extrabold">Promoções salvas</h2>
        {salvas.length === 0 ? <Vazio titulo="Nenhuma promoção salva" texto="Simule uma promoção e salve para consultar depois." /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {salvas.map((s) => (
              <div key={s.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="truncate font-extrabold">{s.nome}</p><p className="text-sm text-gray-600">{Number(s.desconto_pct)}% off · {brl(Number(s.preco_promocional))} · lucro {brl(Number(s.lucro_promocional))}</p><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${ST[s.status].c}`}>{ST[s.status].t}</span></div>
                <button className="grid h-11 w-11 place-items-center rounded-xl text-perigo ring-1 ring-black/10" aria-label={`Excluir ${s.nome}`} onClick={async () => { try { await deletePromotion(s.id); await carregar(); } catch (e) { toast.erro(mensagemErro(e)); } }}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </ProGate>
    </div>
  );
}

function Box({ a, b, destaque }: { a: string; b: string; destaque?: boolean }) {
  return <div className="card !p-4"><p className="text-xs font-semibold text-gray-600">{a}</p><p className={`text-xl font-extrabold ${destaque ? 'text-rosa-escuro' : ''}`}>{b}</p></div>;
}
