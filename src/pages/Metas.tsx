import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Aviso, Button, NumField, PageHeader, ProGate, Vazio } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { useToast } from '../hooks/useToast';
import { deleteGoal, listGoals, saveGoal, updateGoalRealizado } from '../services/api';
import { mensagemErro } from '../services/supabase';
import { brl, int, num, pctFmt, toInput } from '../utils/format';
import { calcularMeta } from '../utils/pricing';
import type { Goal } from '../types';

export default function Metas() {
  const { business, can } = useAuth();
  const { produtos } = useProducts();
  const toast = useToast();
  const [metas, setMetas] = useState<Goal[]>([]);
  const [meta, setMeta] = useState('');
  const [dias, setDias] = useState('26');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [edit, setEdit] = useState<Record<string, string>>({});

  const carregar = () => listGoals().then(setMetas).catch(() => setMetas([]));
  useEffect(() => { void carregar(); }, []);

  const medias = useMemo(() => {
    if (!produtos.length) return null;
    return { preco: produtos.reduce((s, p) => s + Number(p.preco_recomendado), 0) / produtos.length, custo: produtos.reduce((s, p) => s + Number(p.custo_total), 0) / produtos.length };
  }, [produtos]);

  const r = calcularMeta({ metaFaturamento: num(meta), diasVenda: num(dias), precoMedio: num(preco), custoMedio: num(custo) });

  const salvar = async () => {
    if (!business || !r.ok) return;
    setSalvando(true);
    try {
      await saveGoal({ business_id: business.id, mes: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), meta_faturamento: num(meta), dias_venda: num(dias), preco_medio: num(preco), custo_medio: num(custo), realizado: 0 });
      toast.ok('Meta criada.'); await carregar();
    } catch (e) { toast.erro(mensagemErro(e)); }
    setSalvando(false);
  };

  return (
    <div>
      <PageHeader titulo="Minhas metas" subtitulo="Descubra quantas vendas por dia levam você até o faturamento que deseja." />
      <ProGate liberado={can('metas')} nome="Metas">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4">
            <NumField label="Meta de faturamento mensal" prefixo="R$" value={meta} onChange={(e) => setMeta(e.target.value)} />
            <NumField label="Dias de venda no mês" value={dias} onChange={(e) => setDias(e.target.value)} hint="Quantos dias você vende por mês." />
            <NumField label="Preço médio" prefixo="R$" value={preco} onChange={(e) => setPreco(e.target.value)} />
            <NumField label="Custo médio" prefixo="R$" value={custo} onChange={(e) => setCusto(e.target.value)} />
            {medias && <Button variante="soft" onClick={() => { setPreco(toInput(Number(medias.preco.toFixed(2)))); setCusto(toInput(Number(medias.custo.toFixed(2)))); }}>Usar a média dos meus produtos</Button>}
          </div>
          <div className="space-y-4">
            {!r.ok ? <div className="card text-gray-600">{num(meta) || num(preco) ? <Aviso tom="alerta"><ul>{r.erros.map((e) => <li key={e}>{e}</li>)}</ul></Aviso> : 'Preencha os campos para ver quantas vendas você precisa.'}</div> : (
              <div className="pop space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[['Unidades por mês', int(r.unidadesMes)], ['Unidades por dia', r.unidadesDia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })], ['Faturamento por dia', brl(r.faturamentoDia)], ['Lucro estimado', brl(r.lucroEstimado)]].map(([a, b]) => (
                    <div key={a} className="card !p-4"><p className="text-xs font-semibold text-gray-600">{a}</p><p className="text-xl font-extrabold">{b}</p></div>
                  ))}
                </div>
                <Button className="w-full" carregando={salvando} onClick={() => void salvar()}>SALVAR META</Button>
              </div>
            )}
          </div>
        </div>

        <h2 className="mb-3 mt-10 text-xl font-extrabold">Progresso</h2>
        {metas.length === 0 ? <Vazio titulo="Nenhuma meta criada" texto="Crie uma meta e acompanhe quanto já vendeu no mês." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {metas.map((g) => {
              const prog = Number(g.realizado) / Number(g.meta_faturamento);
              const pct = Math.min(1, prog);
              const valorEdit = edit[g.id] ?? toInput(Number(g.realizado));
              return (
                <div key={g.id} className="card space-y-3">
                  <div className="flex items-start justify-between">
                    <div><p className="text-sm font-bold text-gray-600">META · {new Date(g.mes + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p><p className="text-2xl font-extrabold">{brl(Number(g.meta_faturamento))}</p></div>
                    <button className="grid h-11 w-11 place-items-center rounded-xl text-perigo ring-1 ring-black/10" aria-label="Excluir meta" onClick={async () => { try { await deleteGoal(g.id); await carregar(); } catch (e) { toast.erro(mensagemErro(e)); } }}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-lilas" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta"><div className="barra h-full rounded-full bg-gradient-to-r from-rosa to-roxo" style={{ width: `${pct * 100}%` }} /></div>
                  <p className="font-bold">{pctFmt(pct, 0)} · {prog >= 1 ? '🎉 Meta atingida!' : `Faltam ${brl(Number(g.meta_faturamento) - Number(g.realizado))} para atingir sua meta.`}</p>
                  <div className="flex items-end gap-2">
                    <NumField label="Já vendi neste mês" prefixo="R$" value={valorEdit} onChange={(e) => setEdit((s) => ({ ...s, [g.id]: e.target.value }))} className="flex-1" />
                    <Button variante="soft" disabled={!(num(valorEdit) >= 0)} onClick={async () => { try { await updateGoalRealizado(g.id, num(valorEdit)); toast.ok('Progresso atualizado.'); await carregar(); } catch (e) { toast.erro(mensagemErro(e)); } }}>Atualizar</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ProGate>
    </div>
  );
}
