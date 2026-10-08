import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Copy, Pencil, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { BadgeDemo, Button, Confirmar, PaginaCarregando, Stat, StatusBadge } from '../components/ui';
import { useProducts } from '../hooks/useProducts';
import { useToast } from '../hooks/useToast';
import { deleteProduct, duplicateProduct, getProduct, listChannels, listHistory, listPromotions } from '../services/api';
import { mensagemErro } from '../services/supabase';
import { brl, pctFmt } from '../utils/format';
import type { HistoryRow, Product, Promotion, SalesChannelRow } from '../types';

export default function ProdutoDetalhe() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { reload } = useProducts();
  const [p, setP] = useState<Product | null>(null);
  const [hist, setHist] = useState<HistoryRow[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [canais, setCanais] = useState<SalesChannelRow[]>([]);
  const [excluir, setExcluir] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const prod = await getProduct(id);
        setP(prod);
        const [h, pr, c] = await Promise.all([listHistory(id), listPromotions(), listChannels(id)]);
        setHist(h); setPromos(pr.filter((x) => x.product_id === id)); setCanais(c);
      } catch (e) { toast.erro(mensagemErro(e)); nav('/app/produtos'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!p) return <PaginaCarregando />;
  const n = (v: number) => Number(v);
  const perdas = (n(p.materiais) + n(p.mao_de_obra) + n(p.embalagem) + n(p.outros)) * (n(p.perdas_pct) / 100);
  const custos: [string, number][] = [
    ['Materiais', n(p.materiais)], ['Mão de obra', n(p.mao_de_obra)], ['Embalagem', n(p.embalagem)], ['Outros custos variáveis', n(p.outros)],
    [`Perdas (${n(p.perdas_pct)}%)`, perdas], ['Frete / entrega', n(p.frete)], ['Custo fixo rateado', n(p.custos_fixos) / n(p.unidades_mes)],
  ];

  const duplicar = async () => {
    try { const c = await duplicateProduct(p); await reload(); toast.ok('Produto duplicado.'); nav(`/app/produtos/${c.id}`); } catch (e) { toast.erro(mensagemErro(e)); }
  };
  const remover = async () => {
    setOcupado(true);
    try { await deleteProduct(p.id); await reload(); toast.ok('Produto excluído.'); nav('/app/produtos'); } catch (e) { toast.erro(mensagemErro(e)); setOcupado(false); }
  };

  return (
    <div className="space-y-6">
      <Link to="/app/produtos" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-roxo"><ArrowLeft className="h-4 w-4" />Meus produtos</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{p.name} {p.is_demo && <BadgeDemo />}</h1>
          <p className="mt-1 text-gray-600">{p.category || 'Sem categoria'}</p>
          <div className="mt-2"><StatusBadge status={p.status} longo /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variante="soft" onClick={() => nav(`/app/precificar/${p.id}`)}><Pencil className="h-4 w-4" />Editar</Button>
          <Button variante="ghost" onClick={() => void duplicar()}><Copy className="h-4 w-4" />Duplicar</Button>
          <Button variante="ghost" className="!text-perigo" onClick={() => setExcluir(true)}><Trash2 className="h-4 w-4" />Excluir</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat rotulo="Preço recomendado" valor={brl(n(p.preco_recomendado))} destaque />
        <Stat rotulo="Lucro por unidade" valor={brl(n(p.lucro_unitario))} />
        <Stat rotulo="Margem" valor={pctFmt(n(p.margem_real))} />
        <Stat rotulo="Preço mínimo" valor={brl(n(p.preco_minimo))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-extrabold">Custos por unidade</h2>
          <dl className="space-y-2 text-sm">
            {custos.map(([a, b]) => <div key={a} className="flex justify-between border-b border-black/5 pb-2"><dt className="text-gray-600">{a}</dt><dd className="font-bold">{brl(b)}</dd></div>)}
            <div className="flex justify-between pt-1 text-base"><dt className="font-extrabold">Custo total</dt><dd className="font-extrabold">{brl(n(p.custo_total))}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-gray-600">Impostos {n(p.impostos_pct)}% · taxas {n(p.taxas_pct)}% · comissão {n(p.comissao_pct)}% · margem desejada {n(p.margem_pct)}% · {n(p.unidades_mes)} un/mês</p>
          <p className="mt-2 text-sm">Faturamento projetado <b>{brl(n(p.faturamento_mensal))}</b> · lucro projetado <b>{brl(n(p.lucro_mensal))}</b></p>
        </section>

        <section className="card">
          <h2 className="mb-3 font-extrabold">Histórico de alterações</h2>
          {hist.length === 0 ? <p className="text-sm text-gray-600">Nenhuma alteração registrada.</p> : (
            <ul className="space-y-2 text-sm">
              {hist.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-xl bg-lilas/40 px-3 py-2">
                  <span className="text-gray-600">{new Date(h.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className="font-bold">{brl(h.result.precoRecomendado)} · {pctFmt(h.result.margem)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold"><Tag className="h-4 w-4" aria-hidden />Promoções</h2>
          {promos.length === 0 ? <p className="text-sm text-gray-600">Nenhuma promoção salva para este produto.</p> : (
            <ul className="space-y-2 text-sm">{promos.map((x) => <li key={x.id} className="flex justify-between"><span>{x.nome} ({Number(x.desconto_pct)}% off)</span><b>{brl(Number(x.preco_promocional))}</b></li>)}</ul>
          )}
          <Link to={`/app/promocoes?produto=${p.id}`} className="mt-3 inline-block text-sm font-bold text-roxo underline">Simular promoção</Link>
        </section>

        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold"><ShoppingBag className="h-4 w-4" aria-hidden />Canais de venda</h2>
          {canais.length === 0 ? <p className="text-sm text-gray-600">Nenhuma comparação de canais salva.</p> : (
            <ul className="space-y-2 text-sm">{canais.map((c) => <li key={c.id} className="flex justify-between"><span>{c.canal}</span><b>{brl(Number(c.lucro_liquido))} · {pctFmt(Number(c.margem))}</b></li>)}</ul>
          )}
          <Link to={`/app/canais?produto=${p.id}`} className="mt-3 inline-block text-sm font-bold text-roxo underline">Comparar canais</Link>
        </section>
      </div>

      {p.recipe_id && (
        <Link to={`/app/fichas/${p.recipe_id}`} className="card flex items-center gap-3 font-bold"><ClipboardList className="h-5 w-5 text-roxo" aria-hidden />Ver a ficha técnica deste produto</Link>
      )}

      <Confirmar aberto={excluir} titulo="Excluir produto?" texto={`“${p.name}” e o histórico dele serão apagados. Isso não pode ser desfeito.`} carregando={ocupado} onConfirmar={() => void remover()} onFechar={() => setExcluir(false)} />
    </div>
  );
}
