import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { useToast } from '../hooks/useToast';
import { clearDemo, listGoals, loadDemo } from '../services/api';
import { mensagemErro } from '../services/supabase';
import { Aviso, BadgeDemo, Button, PaginaCarregando, StatusBadge, Stat, Vazio } from '../components/ui';
import { brl, pctFmt } from '../utils/format';
import { gerarAlertas } from '../utils/alerts';
import type { Goal } from '../types';

const CORES = ['#BE185D', '#7C3AED', '#EC4899', '#F59E0B', '#16A34A', '#DC2626', '#1F2937'];

export default function Dashboard() {
  const { nome, business } = useAuth();
  const { produtos, loading, modo, setModo, temDemo, temReal, reload } = useProducts();
  const toast = useToast();
  const nav = useNavigate();
  const [metas, setMetas] = useState<Goal[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { listGoals().then(setMetas).catch(() => setMetas([])); }, []);

  const tot = useMemo(() => {
    const fat = produtos.reduce((s, p) => s + Number(p.faturamento_mensal), 0);
    const luc = produtos.reduce((s, p) => s + Number(p.lucro_mensal), 0);
    return { fat, luc, margem: fat > 0 ? luc / fat : 0 };
  }, [produtos]);

  const dados = useMemo(() => produtos.map((p) => ({
    nome: p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name,
    faturamento: Number(p.faturamento_mensal), lucro: Number(p.lucro_mensal), margem: Number((Number(p.margem_real) * 100).toFixed(1)),
  })), [produtos]);

  const composicao = useMemo(() => {
    const c = { Materiais: 0, 'Mão de obra': 0, Embalagem: 0, Outros: 0, Frete: 0, Perdas: 0, 'Custos fixos': 0 };
    for (const p of produtos) {
      const u = Number(p.unidades_mes), perd = Number(p.perdas_pct) / 100;
      c.Materiais += Number(p.materiais) * u; c['Mão de obra'] += Number(p.mao_de_obra) * u; c.Embalagem += Number(p.embalagem) * u; c.Outros += Number(p.outros) * u;
      c.Perdas += (Number(p.materiais) + Number(p.mao_de_obra) + Number(p.embalagem) + Number(p.outros)) * u * perd;
      c.Frete += Number(p.frete) * u; c['Custos fixos'] += Number(p.custos_fixos);
    }
    return Object.entries(c).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [produtos]);

  const atencao = produtos.filter((p) => p.status !== 'saudavel');
  const alertas = gerarAlertas(produtos, metas);

  const demo = async () => {
    if (!business) return;
    setOcupado(true);
    try { await loadDemo(business.id); await reload(); setModo('demo'); toast.ok('Dados de demonstração carregados.'); } catch (e) { toast.erro(mensagemErro(e)); }
    setOcupado(false);
  };
  const removerDemo = async () => {
    setOcupado(true);
    try { await clearDemo(); await reload(); setModo('real'); toast.ok('Demonstração removida.'); } catch (e) { toast.erro(mensagemErro(e)); }
    setOcupado(false);
  };

  if (loading) return <PaginaCarregando />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Olá, {nome.split(' ')[0] || 'por aqui'} 👋</h1>
          <p className="mt-1 text-gray-600">Veja como está a saúde dos seus preços.</p>
        </div>
        <Button onClick={() => nav('/app/precificar')}><Plus className="h-5 w-5" />Novo Produto</Button>
      </div>

      {temDemo && temReal && (
        <div className="inline-flex rounded-2xl bg-white p-1 shadow-suave ring-1 ring-black/5" role="group" aria-label="Tipo de dados">
          {(['real', 'demo'] as const).map((m) => (
            <button key={m} onClick={() => setModo(m)} aria-pressed={modo === m} className={`min-h-[44px] rounded-xl px-4 text-sm font-bold ${modo === m ? 'bg-roxo text-white' : 'text-gray-700'}`}>{m === 'real' ? 'Meus produtos' : 'Demonstração'}</button>
          ))}
        </div>
      )}

      {produtos.length === 0 ? (
        <Vazio
          titulo="Vamos descobrir quanto você deveria cobrar?"
          texto="Cadastre seu primeiro produto e veja o preço ideal, o lucro e a margem em poucos minutos."
          acao={
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => nav('/app/precificar')}>CRIAR MEU PRIMEIRO PRODUTO</Button>
              {!temDemo && <Button variante="soft" carregando={ocupado} onClick={() => void demo()}>Carregar dados de demonstração</Button>}
            </div>
          }
        />
      ) : (
        <>
          {modo === 'demo' && <Aviso tom="alerta"><span className="mr-2"><BadgeDemo /></span>Estes são produtos de exemplo. Eles não contam no limite do plano e podem ser removidos a qualquer momento.</Aviso>}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat rotulo="Faturamento projetado" valor={brl(tot.fat)} destaque />
            <Stat rotulo="Lucro projetado" valor={brl(tot.luc)} />
            <Stat rotulo="Margem média" valor={pctFmt(tot.margem)} />
            <Stat rotulo="Produtos cadastrados" valor={produtos.length} />
          </div>

          {alertas.length > 0 && (
            <div className="space-y-2">
              {alertas.map((a) => (
                <Link key={a.id} to={a.produtoId ? `/app/produtos/${a.produtoId}` : '/app/metas'} className="block">
                  <Aviso tom={a.tom}>{a.texto}</Aviso>
                </Link>
              ))}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Grafico titulo="Faturamento por produto"><BarChart data={dados}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nome" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={50} /><Tooltip formatter={(v: number) => brl(v)} /><Bar dataKey="faturamento" name="Faturamento" fill="#7C3AED" radius={[8, 8, 0, 0]} /></BarChart></Grafico>
            <Grafico titulo="Lucro por produto"><BarChart data={dados}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nome" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={50} /><Tooltip formatter={(v: number) => brl(v)} /><Bar dataKey="lucro" name="Lucro" fill="#16A34A" radius={[8, 8, 0, 0]} /></BarChart></Grafico>
            <Grafico titulo="Margem por produto (%)"><BarChart data={dados}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nome" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={40} unit="%" /><Tooltip formatter={(v: number) => `${v}%`} /><Bar dataKey="margem" name="Margem" fill="#EC4899" radius={[8, 8, 0, 0]} /></BarChart></Grafico>
            <Grafico titulo="Composição dos custos (mês)">
              <PieChart><Pie data={composicao} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{composicao.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}</Pie><Tooltip formatter={(v: number) => brl(v)} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart>
            </Grafico>
          </div>

          <section>
            <h2 className="mb-3 text-xl font-extrabold">Produtos que precisam de atenção</h2>
            {atencao.length === 0 ? (
              <Aviso tom="ok">🟢 Tudo certo: todos os produtos têm margem saudável.</Aviso>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {atencao.map((p) => (
                  <Link key={p.id} to={`/app/produtos/${p.id}`} className="card flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-bold">{p.name}</p><p className="text-sm text-gray-600">Preço {brl(Number(p.preco_recomendado))} · margem {pctFmt(Number(p.margem_real))}</p></div>
                    <StatusBadge status={p.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-3 border-t border-black/5 pt-4">
            {!temDemo && <Button variante="ghost" carregando={ocupado} onClick={() => void demo()}>Carregar dados de demonstração</Button>}
            {temDemo && <Button variante="ghost" carregando={ocupado} onClick={() => void removerDemo()}>Remover dados de demonstração</Button>}
          </div>
        </>
      )}
    </div>
  );
}

function Grafico({ titulo, children }: { titulo: string; children: React.ReactElement }) {
  return (
    <div className="card">
      <h3 className="mb-3 font-extrabold">{titulo}</h3>
      <div className="h-64" role="img" aria-label={titulo}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}
