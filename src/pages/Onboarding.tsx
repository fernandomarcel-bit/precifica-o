import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { Aviso, Button, Field, Logo, PaginaCarregando, SelectField } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { createBusiness } from '../services/api';
import { mensagemErro } from '../services/supabase';

const SEGMENTOS = ['Confeitaria', 'Doceria', 'Salgados', 'Restaurante', 'Alimentação', 'Artesanato', 'Loja', 'Serviços', 'Outro'];
const METAS = [
  { id: 'descobrir_precos', t: 'Descobrir meus preços' },
  { id: 'aumentar_lucro', t: 'Aumentar meu lucro' },
  { id: 'organizar_produtos', t: 'Organizar meus produtos' },
  { id: 'meta_faturamento', t: 'Atingir uma meta de faturamento' },
];

export default function Onboarding() {
  const { business, session, refresh, nome, loading } = useAuth();
  const nav = useNavigate();
  const [passo, setPasso] = useState(0);
  const [nomeNegocio, setNomeNegocio] = useState('');
  const [segmento, setSegmento] = useState('Confeitaria');
  const [meta, setMeta] = useState('descobrir_precos');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (loading) return <PaginaCarregando />;
  if (!session) return <Navigate to="/entrar" replace />;
  if (business && passo < 2) return <Navigate to="/app" replace />;

  const concluir = async () => {
    setErro(''); setSalvando(true);
    try {
      await createBusiness({ name: nomeNegocio.trim(), segment: segmento, main_goal: meta });
      await refresh();
      setPasso(2);
    } catch (e) { setErro(mensagemErro(e)); }
    setSalvando(false);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-rosa-claro via-white to-lilas px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center"><Logo className="text-xl" /></div>
        <div className="card p-6 sm:p-8">
          {passo < 2 && <div className="mb-6 flex gap-2" aria-label={`Passo ${passo + 1} de 2`}>{[0, 1].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= passo ? 'bg-roxo' : 'bg-gray-200'}`} />)}</div>}

          {passo === 0 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-extrabold">Vamos conhecer o seu negócio{nome ? `, ${nome.split(' ')[0]}` : ''}</h1>
              <Field label="Nome do negócio" value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} maxLength={120} placeholder="Ex.: Doçuras da Alice" />
              <SelectField label="Segmento" value={segmento} onChange={(e) => setSegmento(e.target.value)}>
                {SEGMENTOS.map((s) => <option key={s}>{s}</option>)}
              </SelectField>
              <Button className="w-full" disabled={nomeNegocio.trim().length < 1} onClick={() => setPasso(1)}>CONTINUAR</Button>
            </div>
          )}

          {passo === 1 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-extrabold">Qual sua principal meta?</h1>
              <fieldset className="space-y-2">
                <legend className="sr-only">Principal meta</legend>
                {METAS.map((m) => (
                  <label key={m.id} className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 font-semibold transition ${meta === m.id ? 'border-roxo bg-lilas text-roxo' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="meta" className="h-5 w-5 accent-roxo" checked={meta === m.id} onChange={() => setMeta(m.id)} />{m.t}
                  </label>
                ))}
              </fieldset>
              {erro && <Aviso tom="perigo">{erro}</Aviso>}
              <div className="flex gap-3">
                <Button variante="ghost" onClick={() => setPasso(0)}>Voltar</Button>
                <Button className="flex-1" carregando={salvando} onClick={() => void concluir()}>CONCLUIR</Button>
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="space-y-4 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rosa to-roxo text-white"><Rocket className="h-8 w-8" /></span>
              <h1 className="text-2xl font-extrabold">Seu Precificação PRO está pronto.</h1>
              <p className="text-lg text-gray-700">Vamos descobrir quanto você deveria cobrar?</p>
              <Button className="w-full" onClick={() => nav('/app/precificar')}>CRIAR MEU PRIMEIRO PRODUTO</Button>
              <button className="text-sm font-bold text-roxo underline" onClick={() => nav('/app')}>Ir para o painel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
