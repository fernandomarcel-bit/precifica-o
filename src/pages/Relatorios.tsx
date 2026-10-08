import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { Button, Field, PageHeader, PaginaCarregando, ProGate, SelectField, Vazio } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { useToast } from '../hooks/useToast';
import { listChannels, listGoals } from '../services/api';
import { brl, int, pctFmt } from '../utils/format';
import { calcularEquilibrio } from '../utils/pricing';
import type { Goal, SalesChannelRow } from '../types';

type Fmt = 'txt' | 'brl' | 'pct' | 'int';
interface Tabela { titulo: string; colunas: { h: string; f: Fmt }[]; linhas: (string | number)[][] }
const TIPOS = ['Produtos', 'Custos', 'Preços', 'Margens', 'Lucros', 'Metas', 'Ponto de equilíbrio', 'Canais'] as const;
type Tipo = (typeof TIPOS)[number];

const fmt = (v: string | number, f: Fmt) => (typeof v === 'string' ? v : f === 'brl' ? brl(v) : f === 'pct' ? pctFmt(v) : f === 'int' ? int(v) : String(v));
const statusTxt = { saudavel: 'Saudável', baixa: 'Margem baixa', prejuizo: 'Prejuízo' } as const;

export default function Relatorios() {
  const { can } = useAuth();
  const { produtos, loading } = useProducts();
  const toast = useToast();
  const [tipo, setTipo] = useState<Tipo>('Produtos');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [categoria, setCategoria] = useState('');
  const [canal, setCanal] = useState('');
  const [metas, setMetas] = useState<Goal[]>([]);
  const [canais, setCanais] = useState<(SalesChannelRow & { products?: { name: string; category: string | null } })[]>([]);

  useEffect(() => { listGoals().then(setMetas).catch(() => setMetas([])); listChannels().then(setCanais).catch(() => setCanais([])); }, []);

  const categorias = useMemo(() => [...new Set(produtos.map((p) => p.category).filter(Boolean) as string[])], [produtos]);
  const nomesCanais = useMemo(() => [...new Set(canais.map((c) => c.canal))], [canais]);

  const filtrados = useMemo(() => produtos.filter((p) => {
    const d = p.created_at.slice(0, 10);
    return (!de || d >= de) && (!ate || d <= ate) && (!produtoId || p.id === produtoId) && (!categoria || p.category === categoria) &&
      (!canal || canais.some((c) => c.product_id === p.id && c.canal === canal));
  }), [produtos, de, ate, produtoId, categoria, canal, canais]);

  const tabela: Tabela = useMemo(() => {
    const T = (titulo: string, colunas: Tabela['colunas'], linhas: Tabela['linhas']): Tabela => ({ titulo, colunas, linhas });
    switch (tipo) {
      case 'Custos': return T('Relatório de custos', [{ h: 'Produto', f: 'txt' }, { h: 'Custo variável', f: 'brl' }, { h: 'Custo fixo rateado', f: 'brl' }, { h: 'Custo total', f: 'brl' }], filtrados.map((p) => [p.name, Number(p.custo_variavel), Number(p.custo_total) - Number(p.custo_variavel), Number(p.custo_total)]));
      case 'Preços': return T('Relatório de preços', [{ h: 'Produto', f: 'txt' }, { h: 'Preço mínimo', f: 'brl' }, { h: 'Preço recomendado', f: 'brl' }, { h: 'Custo total', f: 'brl' }], filtrados.map((p) => [p.name, Number(p.preco_minimo), Number(p.preco_recomendado), Number(p.custo_total)]));
      case 'Margens': return T('Relatório de margens', [{ h: 'Produto', f: 'txt' }, { h: 'Margem desejada', f: 'pct' }, { h: 'Margem real', f: 'pct' }, { h: 'Status', f: 'txt' }], filtrados.map((p) => [p.name, Number(p.margem_pct) / 100, Number(p.margem_real), statusTxt[p.status]]));
      case 'Lucros': return T('Relatório de lucros', [{ h: 'Produto', f: 'txt' }, { h: 'Lucro por unidade', f: 'brl' }, { h: 'Unidades/mês', f: 'int' }, { h: 'Lucro mensal', f: 'brl' }, { h: 'Faturamento mensal', f: 'brl' }], filtrados.map((p) => [p.name, Number(p.lucro_unitario), Number(p.unidades_mes), Number(p.lucro_mensal), Number(p.faturamento_mensal)]));
      case 'Metas': return T('Relatório de metas', [{ h: 'Mês', f: 'txt' }, { h: 'Meta', f: 'brl' }, { h: 'Realizado', f: 'brl' }, { h: 'Progresso', f: 'pct' }], metas.filter((g) => (!de || g.mes >= de.slice(0, 7) + '-01') && (!ate || g.mes <= ate)).map((g) => [new Date(g.mes + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), Number(g.meta_faturamento), Number(g.realizado), Math.min(1, Number(g.realizado) / Number(g.meta_faturamento))]));
      case 'Ponto de equilíbrio': return T('Relatório de ponto de equilíbrio', [{ h: 'Produto', f: 'txt' }, { h: 'Custos fixos', f: 'brl' }, { h: 'Sobra por venda', f: 'brl' }, { h: 'Unidades para equilíbrio', f: 'txt' }, { h: 'Faturamento para equilíbrio', f: 'txt' }], filtrados.map((p) => {
        const r = calcularEquilibrio({ custosFixos: Number(p.custos_fixos), preco: Number(p.preco_recomendado), custoVariavel: Number(p.custo_variavel) });
        return [p.name, Number(p.custos_fixos), r.ok ? r.margemContribuicao : 0, r.ok ? int(r.unidades) : '—', r.ok ? brl(r.faturamento) : '—'];
      }));
      case 'Canais': return T('Relatório de canais', [{ h: 'Produto', f: 'txt' }, { h: 'Canal', f: 'txt' }, { h: 'Preço', f: 'brl' }, { h: 'Lucro líquido', f: 'brl' }, { h: 'Margem', f: 'pct' }], canais.filter((c) => (!canal || c.canal === canal) && (!produtoId || c.product_id === produtoId) && filtrados.some((p) => p.id === c.product_id)).map((c) => [c.products?.name ?? '—', c.canal, Number(c.preco), Number(c.lucro_liquido), Number(c.margem)]));
      default: return T('Relatório de produtos', [{ h: 'Produto', f: 'txt' }, { h: 'Categoria', f: 'txt' }, { h: 'Custo', f: 'brl' }, { h: 'Preço', f: 'brl' }, { h: 'Lucro', f: 'brl' }, { h: 'Margem', f: 'pct' }, { h: 'Status', f: 'txt' }], filtrados.map((p) => [p.name, p.category ?? '—', Number(p.custo_total), Number(p.preco_recomendado), Number(p.lucro_unitario), Number(p.margem_real), statusTxt[p.status]]));
    }
  }, [tipo, filtrados, metas, canais, canal, produtoId, de, ate]);

  const textos = tabela.linhas.map((l) => l.map((v, i) => fmt(v, tabela.colunas[i].f)));
  const arquivo = `precificacao-pro-${tipo.toLowerCase().replace(/\s+/g, '-')}`;
  const baixar = (blob: Blob, nome: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };

  const csv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const body = [tabela.colunas.map((c) => esc(c.h)).join(';'), ...textos.map((l) => l.map(esc).join(';'))].join('\r\n');
    baixar(new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' }), `${arquivo}.csv`);
  };
  const excel = () => {
    const ws = XLSX.utils.aoa_to_sheet([tabela.colunas.map((c) => c.h), ...tabela.linhas]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, tipo.slice(0, 30));
    XLSX.writeFile(wb, `${arquivo}.xlsx`);
  };
  const pdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.text(`Precificação PRO — ${tabela.titulo}`, 14, 16);
    doc.setFontSize(9); doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 22);
    autoTable(doc, { startY: 28, head: [tabela.colunas.map((c) => c.h)], body: textos, headStyles: { fillColor: [190, 24, 93] }, styles: { fontSize: 9 } });
    doc.setFontSize(7); doc.text('Controle gerencial e formação de preços. Regras tributárias variam; consulte um contador quando necessário.', 14, doc.internal.pageSize.getHeight() - 8);
    doc.save(`${arquivo}.pdf`);
  };
  const exportar = (fn: () => void) => { try { fn(); toast.ok('Arquivo gerado.'); } catch { toast.erro('Não foi possível gerar o arquivo.'); } };

  if (loading) return <PaginaCarregando />;
  return (
    <div>
      <PageHeader titulo="Relatórios" subtitulo="Filtre, confira e exporte seus números." />
      <ProGate liberado={can('relatorios')} nome="Relatórios">
        <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          <Field label="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          <SelectField label="Produto" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}><option value="">Todos</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>
          <SelectField label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}><option value="">Todas</option>{categorias.map((c) => <option key={c}>{c}</option>)}</SelectField>
          <SelectField label="Canal" value={canal} onChange={(e) => setCanal(e.target.value)}><option value="">Todos</option>{nomesCanais.map((c) => <option key={c}>{c}</option>)}</SelectField>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Tipo de relatório">
          {TIPOS.map((t) => <button key={t} role="tab" aria-selected={tipo === t} onClick={() => setTipo(t)} className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-bold ${tipo === t ? 'bg-roxo text-white' : 'bg-white text-gray-700 ring-1 ring-black/10'}`}>{t}</button>)}
        </div>

        {tabela.linhas.length === 0 ? <Vazio titulo="Sem dados para este relatório" texto="Ajuste os filtros ou cadastre produtos para ver resultados aqui." /> : (
          <>
            <div className="card overflow-x-auto !p-0">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{tabela.titulo}</caption>
                <thead className="bg-lilas/50"><tr>{tabela.colunas.map((c) => <th key={c.h} scope="col" className="px-4 py-3 font-bold">{c.h}</th>)}</tr></thead>
                <tbody>{textos.map((l, i) => <tr key={i} className="border-t border-black/5">{l.map((v, k) => <td key={k} className={`px-4 py-3 ${k === 0 ? 'font-bold' : ''}`}>{v}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <ProGate liberado={can('exportacao')} nome="Exportação">
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variante="soft" onClick={() => exportar(pdf)}><Download className="h-4 w-4" />PDF</Button>
                <Button variante="soft" onClick={() => exportar(csv)}><Download className="h-4 w-4" />CSV</Button>
                <Button variante="soft" onClick={() => exportar(excel)}><Download className="h-4 w-4" />Excel</Button>
              </div>
            </ProGate>
          </>
        )}
      </ProGate>
    </div>
  );
}
