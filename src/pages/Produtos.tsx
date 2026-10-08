import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { BadgeDemo, Button, Confirmar, PageHeader, PaginaCarregando, StatusBadge, Vazio } from '../components/ui';
import { useProducts } from '../hooks/useProducts';
import { useToast } from '../hooks/useToast';
import { deleteProduct, duplicateProduct } from '../services/api';
import { mensagemErro } from '../services/supabase';
import { brl, pctFmt } from '../utils/format';
import type { Product } from '../types';

const FILTROS = [
  { id: 'todos', t: 'Todos' }, { id: 'saudavel', t: 'Saudáveis' }, { id: 'baixa', t: 'Margem baixa' }, { id: 'prejuizo', t: 'Prejuízo' },
] as const;

export default function Produtos() {
  const { produtos, loading, reload, modo } = useProducts();
  const toast = useToast();
  const nav = useNavigate();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['id']>('todos');
  const [busca, setBusca] = useState('');
  const [excluir, setExcluir] = useState<Product | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const lista = useMemo(() => produtos.filter((p) =>
    (filtro === 'todos' || p.status === filtro) &&
    (`${p.name} ${p.category ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase()))
  ), [produtos, filtro, busca]);

  const duplicar = async (p: Product) => {
    try { await duplicateProduct(p); await reload(); toast.ok('Produto duplicado.'); } catch (e) { toast.erro(mensagemErro(e)); }
  };
  const confirmarExcluir = async () => {
    if (!excluir) return;
    setOcupado(true);
    try { await deleteProduct(excluir.id); await reload(); toast.ok('Produto excluído.'); setExcluir(null); } catch (e) { toast.erro(mensagemErro(e)); }
    setOcupado(false);
  };

  if (loading) return <PaginaCarregando />;

  return (
    <div>
      <PageHeader titulo="Meus produtos" subtitulo={modo === 'demo' ? 'Mostrando produtos de demonstração.' : 'Todos os preços que você já calculou.'} acao={<Button onClick={() => nav('/app/precificar')}><Plus className="h-5 w-5" />Novo produto</Button>} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
          <input className="input pl-11" placeholder="Pesquisar produto ou categoria" aria-label="Pesquisar produtos" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por status">
          {FILTROS.map((f) => (
            <button key={f.id} onClick={() => setFiltro(f.id)} aria-pressed={filtro === f.id} className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-bold ${filtro === f.id ? 'bg-roxo text-white' : 'bg-white text-gray-700 ring-1 ring-black/10'}`}>{f.t}</button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <Vazio titulo={produtos.length === 0 ? 'Nenhum produto ainda' : 'Nenhum produto encontrado'} texto={produtos.length === 0 ? 'Calcule o preço do seu primeiro produto para ele aparecer aqui.' : 'Tente outro filtro ou outra busca.'} acao={produtos.length === 0 ? <Button onClick={() => nav('/app/precificar')}>CRIAR MEU PRIMEIRO PRODUTO</Button> : undefined} />
      ) : (
        <>
          <div className="card hidden overflow-x-auto !p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-lilas/50 text-gray-700"><tr>{['Produto', 'Categoria', 'Custo', 'Preço', 'Lucro', 'Margem', 'Status', ''].map((h) => <th key={h} scope="col" className="px-4 py-3 font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id} className="border-t border-black/5">
                    <td className="px-4 py-3 font-bold"><Link to={`/app/produtos/${p.id}`} className="hover:text-roxo">{p.name}</Link> {p.is_demo && <BadgeDemo />}</td>
                    <td className="px-4 py-3 text-gray-600">{p.category || '—'}</td>
                    <td className="px-4 py-3">{brl(Number(p.custo_total))}</td>
                    <td className="px-4 py-3 font-bold">{brl(Number(p.preco_recomendado))}</td>
                    <td className="px-4 py-3">{brl(Number(p.lucro_unitario))}</td>
                    <td className="px-4 py-3">{pctFmt(Number(p.margem_real))}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3"><Acoes p={p} onDup={duplicar} onDel={setExcluir} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {lista.map((p) => (
              <div key={p.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/app/produtos/${p.id}`} className="min-w-0"><p className="truncate text-lg font-extrabold">{p.name}</p><p className="text-sm text-gray-600">{p.category || 'Sem categoria'} {p.is_demo && <BadgeDemo />}</p></Link>
                  <StatusBadge status={p.status} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {[['Custo', brl(Number(p.custo_total))], ['Preço', brl(Number(p.preco_recomendado))], ['Lucro', brl(Number(p.lucro_unitario))], ['Margem', pctFmt(Number(p.margem_real))]].map(([a, b]) => <div key={a} className="rounded-xl bg-lilas/50 p-2"><p className="text-gray-600">{a}</p><p className="font-extrabold">{b}</p></div>)}
                </div>
                <Acoes p={p} onDup={duplicar} onDel={setExcluir} />
              </div>
            ))}
          </div>
        </>
      )}

      <Confirmar aberto={!!excluir} titulo="Excluir produto?" texto={`“${excluir?.name}” e o histórico dele serão apagados. Isso não pode ser desfeito.`} carregando={ocupado} onConfirmar={() => void confirmarExcluir()} onFechar={() => setExcluir(null)} />
    </div>
  );
}

function Acoes({ p, onDup, onDel }: { p: Product; onDup: (p: Product) => void; onDel: (p: Product) => void }) {
  const cls = 'grid h-11 w-11 place-items-center rounded-xl text-gray-700 ring-1 ring-black/10 hover:bg-gray-50';
  return (
    <div className="flex gap-2">
      <Link to={`/app/precificar/${p.id}`} className={cls} aria-label={`Editar ${p.name}`}><Pencil className="h-4 w-4" /></Link>
      <button onClick={() => onDup(p)} className={cls} aria-label={`Duplicar ${p.name}`}><Copy className="h-4 w-4" /></button>
      <button onClick={() => onDel(p)} className={`${cls} !text-perigo`} aria-label={`Excluir ${p.name}`}><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}
