import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Aviso, Button, Confirmar, Field, NumField, PageHeader, PaginaCarregando, ProGate, SelectField, Vazio } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { deleteRecipe, getRecipe, listRecipes, saveRecipe } from '../services/api';
import { mensagemErro } from '../services/supabase';
import { brl, num, toInput } from '../utils/format';
import { calcularFicha, UNIDADES, type Ingrediente, type Unidade } from '../utils/pricing';
import type { Recipe } from '../types';

export function FichasLista() {
  const { can } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [lista, setLista] = useState<Recipe[] | null>(null);
  const [excluir, setExcluir] = useState<Recipe | null>(null);
  const carregar = () => listRecipes().then(setLista).catch((e) => { toast.erro(mensagemErro(e)); setLista([]); });
  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <PageHeader titulo="Fichas técnicas" subtitulo="Descubra o custo exato de cada receita e envie direto para a precificação." acao={<Button onClick={() => nav('/app/fichas/nova')}><Plus className="h-5 w-5" />Nova ficha</Button>} />
      <ProGate liberado={can('fichas')} nome="Ficha técnica">
        {lista === null ? <PaginaCarregando /> : lista.length === 0 ? (
          <Vazio titulo="Nenhuma ficha técnica ainda" texto="Liste os ingredientes de uma receita e veja o custo por unidade." acao={<Button onClick={() => nav('/app/fichas/nova')}>CRIAR FICHA TÉCNICA</Button>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {lista.map((r) => (
              <div key={r.id} className="card flex items-center justify-between gap-3">
                <Link to={`/app/fichas/${r.id}`} className="min-w-0 flex-1"><p className="truncate font-extrabold">{r.name}</p><p className="text-sm text-gray-600">Rende {Number(r.rendimento)} · {brl(Number(r.custo_unitario))} por unidade</p></Link>
                <button onClick={() => setExcluir(r)} className="grid h-11 w-11 place-items-center rounded-xl text-perigo ring-1 ring-black/10" aria-label={`Excluir ${r.name}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </ProGate>
      <Confirmar aberto={!!excluir} titulo="Excluir ficha técnica?" texto={`“${excluir?.name}” será apagada. Produtos já criados com ela continuam existindo.`} onFechar={() => setExcluir(null)}
        onConfirmar={async () => { try { await deleteRecipe(excluir!.id); toast.ok('Ficha excluída.'); setExcluir(null); await carregar(); } catch (e) { toast.erro(mensagemErro(e)); } }} />
    </div>
  );
}

interface Linha { nome: string; qtd: string; un: Unidade; preco: string; comprada: string; unCompra: Unidade }
const vazia = (): Linha => ({ nome: '', qtd: '', un: 'g', preco: '', comprada: '', unCompra: 'g' });

export function FichaEditor() {
  const { id } = useParams();
  const { business, can } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [carregando, setCarregando] = useState(!!id);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [rendimento, setRendimento] = useState('1');
  const [linhas, setLinhas] = useState<Linha[]>([vazia()]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    getRecipe(id).then(({ recipe, ingredients }) => {
      setNome(recipe.name); setCategoria(recipe.category ?? ''); setRendimento(toInput(Number(recipe.rendimento)));
      setLinhas(ingredients.length ? ingredients.map((i) => ({ nome: i.nome, qtd: toInput(Number(i.quantidade)), un: i.unidade, preco: toInput(Number(i.preco_compra)), comprada: toInput(Number(i.qtd_comprada)), unCompra: i.unidade_compra })) : [vazia()]);
    }).catch((e) => { toast.erro(mensagemErro(e)); nav('/app/fichas'); }).finally(() => setCarregando(false));
    // eslint-disable-next-line
  }, [id]);

  const ings: Ingrediente[] = useMemo(() => linhas.map((l) => ({ nome: l.nome, quantidade: num(l.qtd), unidade: l.un, precoCompra: num(l.preco), qtdComprada: num(l.comprada), unidadeCompra: l.unCompra })), [linhas]);
  const calc = useMemo(() => calcularFicha(ings, num(rendimento)), [ings, rendimento]);
  const alt = (i: number, patch: Partial<Linha>) => setLinhas((s) => s.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const validas = linhas.filter((l) => l.nome.trim());
  const podeSalvar = nome.trim() && validas.length > 0 && calc.erros.length === 0;

  const salvar = async (enviar: boolean) => {
    if (!business) return;
    setSalvando(true);
    try {
      const r = await saveRecipe(
        { name: nome.trim(), category: categoria.trim() || null, rendimento: num(rendimento), custo_total: calc.custoTotal, custo_unitario: calc.custoPorUnidade, business_id: business.id },
        validas.map((l) => ({ nome: l.nome.trim(), quantidade: num(l.qtd), unidade: l.un, preco_compra: num(l.preco), qtd_comprada: num(l.comprada), unidade_compra: l.unCompra })),
        id
      );
      toast.ok('Ficha técnica salva.');
      if (enviar) nav('/app/precificar', { state: { nome: r.name, categoria: r.category ?? '', materiais: Number(calc.custoPorUnidade.toFixed(4)), recipeId: r.id } });
      else nav('/app/fichas');
    } catch (e) { toast.erro(mensagemErro(e)); }
    setSalvando(false);
  };

  if (carregando) return <PaginaCarregando />;
  return (
    <div>
      <PageHeader titulo={id ? 'Editar ficha técnica' : 'Nova ficha técnica'} subtitulo="Informe o que você usa na receita e quanto pagou por cada ingrediente." />
      <ProGate liberado={can('fichas')} nome="Ficha técnica">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="card grid gap-4 sm:grid-cols-3">
              <Field label="Nome da receita" value={nome} onChange={(e) => setNome(e.target.value)} className="sm:col-span-2" maxLength={120} />
              <NumField label="Rendimento" value={rendimento} onChange={(e) => setRendimento(e.target.value)} hint="Quantas unidades a receita rende." />
              <Field label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="sm:col-span-3" maxLength={60} hint="Opcional." />
            </div>

            {linhas.map((l, i) => (
              <div key={i} className="card space-y-3">
                <div className="flex items-end gap-2">
                  <Field label={`Ingrediente ${i + 1}`} value={l.nome} onChange={(e) => alt(i, { nome: e.target.value })} className="flex-1" placeholder="Ex.: Leite condensado" />
                  <button onClick={() => setLinhas((s) => (s.length > 1 ? s.filter((_, k) => k !== i) : [vazia()]))} className="mb-0.5 grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-perigo ring-1 ring-black/10" aria-label={`Remover ingrediente ${i + 1}`}><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <NumField label="Qtd. utilizada" value={l.qtd} onChange={(e) => alt(i, { qtd: e.target.value })} />
                  <SelectField label="Unidade" value={l.un} onChange={(e) => alt(i, { un: e.target.value as Unidade })}>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</SelectField>
                  <NumField label="Preço de compra" prefixo="R$" value={l.preco} onChange={(e) => alt(i, { preco: e.target.value })} />
                  <NumField label="Qtd. comprada" value={l.comprada} onChange={(e) => alt(i, { comprada: e.target.value })} />
                  <SelectField label="Unidade da compra" value={l.unCompra} onChange={(e) => alt(i, { unCompra: e.target.value as Unidade })} className="col-span-2 sm:col-span-2">{UNIDADES.map((u) => <option key={u}>{u}</option>)}</SelectField>
                  <div className="col-span-2 flex items-end justify-end sm:col-span-2"><p className="text-sm text-gray-600">Custo utilizado <b className="text-lg text-grafite">{brl(calc.linhas[i]?.custo ?? 0)}</b></p></div>
                </div>
                {calc.linhas[i]?.erro && l.nome.trim() && <Aviso tom="alerta">{calc.linhas[i].erro}</Aviso>}
              </div>
            ))}
            <Button variante="soft" onClick={() => setLinhas((s) => [...s, vazia()])}><Plus className="h-4 w-4" />Adicionar ingrediente</Button>
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-card bg-gradient-to-br from-rosa-escuro via-rosa to-roxo p-6 text-white shadow-suave">
              <p className="text-sm font-bold opacity-90">CUSTO TOTAL DA RECEITA</p>
              <p className="text-4xl font-extrabold">{brl(calc.custoTotal)}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="opacity-80">RENDIMENTO</p><p className="text-xl font-extrabold">{num(rendimento) > 0 ? `${num(rendimento)} un` : '—'}</p></div>
                <div><p className="opacity-80">CUSTO POR UNIDADE</p><p className="text-xl font-extrabold">{brl(calc.custoPorUnidade)}</p></div>
              </div>
            </div>
            {calc.erros.length > 0 && validas.length > 0 && <Aviso tom="alerta">{calc.erros[0]}</Aviso>}
            <Button className="w-full" disabled={!podeSalvar} carregando={salvando} onClick={() => void salvar(true)}>ENVIAR PARA PRECIFICAÇÃO</Button>
            <Button className="w-full" variante="ghost" disabled={!podeSalvar} carregando={salvando} onClick={() => void salvar(false)}>Só salvar a ficha</Button>
          </div>
        </div>
      </ProGate>
    </div>
  );
}
