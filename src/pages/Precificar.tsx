import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';
import PricingForm, { type FormMeta } from '../components/PricingForm';
import { Button, PageHeader, PaginaCarregando, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { useToast } from '../hooks/useToast';
import { getProduct, saveProduct } from '../services/api';
import { mensagemErro } from '../services/supabase';
import { brl, pctFmt } from '../utils/format';
import type { PricingInput } from '../utils/pricing';
import type { Product } from '../types';

export default function Precificar() {
  const { id } = useParams();
  const { business } = useAuth();
  const { reload, setModo } = useProducts();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const prefill = loc.state as { nome?: string; categoria?: string; materiais?: number; recipeId?: string } | null;

  const [produto, setProduto] = useState<Product | undefined>();
  const [carregando, setCarregando] = useState(!!id);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Product | null>(null);

  useEffect(() => {
    if (!id) return;
    getProduct(id).then(setProduto).catch((e) => { toast.erro(mensagemErro(e)); nav('/app/produtos'); }).finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const salvar = async (input: PricingInput, meta: FormMeta) => {
    if (!business) return;
    setSalvando(true);
    try {
      const p = await saveProduct(input, { name: meta.name, category: meta.category || null, business_id: business.id, recipe_id: produto?.recipe_id ?? prefill?.recipeId ?? null, is_demo: produto?.is_demo ?? false }, id);
      await reload();
      if (!p.is_demo) setModo('real');
      if (id) { toast.ok('Alterações salvas.'); nav(`/app/produtos/${id}`); } else setSalvo(p);
    } catch (e) { toast.erro(mensagemErro(e)); }
    setSalvando(false);
  };

  if (carregando) return <PaginaCarregando />;

  if (salvo)
    return (
      <div className="mx-auto max-w-lg">
        <div className="card pop space-y-5 text-center">
          <PartyPopper className="mx-auto h-12 w-12 text-rosa" aria-hidden />
          <h1 className="text-2xl font-extrabold">Produto cadastrado com sucesso! 🎉</h1>
          <p className="font-bold">{salvo.name}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-rosa-claro p-3"><p className="text-xs font-semibold text-gray-600">Preço recomendado</p><p className="font-extrabold text-rosa-escuro">{brl(Number(salvo.preco_recomendado))}</p></div>
            <div className="rounded-2xl bg-lilas p-3"><p className="text-xs font-semibold text-gray-600">Lucro</p><p className="font-extrabold text-roxo">{brl(Number(salvo.lucro_unitario))}</p></div>
            <div className="rounded-2xl bg-green-50 p-3"><p className="text-xs font-semibold text-gray-600">Margem</p><p className="font-extrabold text-ok">{pctFmt(Number(salvo.margem_real))}</p></div>
          </div>
          <div className="flex justify-center"><StatusBadge status={salvo.status} longo /></div>
          <Button className="w-full" onClick={() => nav('/app')}>VER NO DASHBOARD</Button>
          <Link to="/app/precificar" reloadDocument className="block text-sm font-bold text-roxo underline">Precificar outro produto</Link>
        </div>
      </div>
    );

  return (
    <div>
      <PageHeader titulo={id ? 'Editar preço' : 'Quanto devo cobrar?'} subtitulo="Responda em etapas. O resultado aparece ao lado, em tempo real." />
      <PricingForm produto={produto} prefill={prefill ?? undefined} salvando={salvando} onSalvar={(i, m) => void salvar(i, m)} />
    </div>
  );
}
