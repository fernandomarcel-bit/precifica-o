import { useState } from 'react';
import { Aviso, Button, Field, PageHeader, SelectField } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { deleteMyAccount, updateBusiness, updateProfile, uploadLogo } from '../services/api';
import { mensagemErro, supabase } from '../services/supabase';

const SEGMENTOS = ['Confeitaria', 'Doceria', 'Salgados', 'Restaurante', 'Alimentação', 'Artesanato', 'Loja', 'Serviços', 'Outro'];

export default function Configuracoes() {
  const { session, business, nome, plan, notificacoes, refresh, signOut } = useAuth();
  const toast = useToast();
  const [nomePerfil, setNomePerfil] = useState(nome);
  const [nomeNeg, setNomeNeg] = useState(business?.name ?? '');
  const [seg, setSeg] = useState(business?.segment ?? 'Outro');
  const [notif, setNotif] = useState(notificacoes);
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [ocupado, setOcupado] = useState('');

  const tarefa = async (nomeT: string, fn: () => Promise<void>, ok: string) => {
    setOcupado(nomeT);
    try { await fn(); toast.ok(ok); } catch (e) { toast.erro(mensagemErro(e)); }
    setOcupado('');
  };

  return (
    <div className="space-y-6">
      <PageHeader titulo="Configurações" />

      <section className="card space-y-4">
        <h2 className="text-lg font-extrabold">Perfil</h2>
        <Field label="Seu nome" value={nomePerfil} onChange={(e) => setNomePerfil(e.target.value)} maxLength={80} />
        <Field label="E-mail" value={session?.user.email ?? ''} readOnly disabled hint="O e-mail é usado para entrar e não pode ser alterado aqui." />
        <Button carregando={ocupado === 'perfil'} disabled={nomePerfil.trim().length < 2} onClick={() => void tarefa('perfil', async () => { await updateProfile(session!.user.id, { full_name: nomePerfil.trim() }); await refresh(); }, 'Perfil atualizado.')}>Salvar perfil</Button>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-extrabold">Negócio</h2>
        <div className="flex items-center gap-4">
          {business?.logo_url ? <img src={business.logo_url} alt="Logo do negócio" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-black/10" /> : <span className="grid h-16 w-16 place-items-center rounded-2xl bg-lilas text-xs font-bold text-roxo">Sem logo</span>}
          <label className="btn-soft cursor-pointer">
            Enviar logo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void tarefa('logo', async () => { const url = await uploadLogo(session!.user.id, f); await updateBusiness(business!.id, { logo_url: url }); await refresh(); }, 'Logo atualizada.');
              e.target.value = '';
            }} />
          </label>
        </div>
        <Field label="Nome do negócio" value={nomeNeg} onChange={(e) => setNomeNeg(e.target.value)} maxLength={120} />
        <SelectField label="Segmento" value={seg} onChange={(e) => setSeg(e.target.value)}>{SEGMENTOS.map((s) => <option key={s}>{s}</option>)}</SelectField>
        <Button carregando={ocupado === 'neg'} disabled={!nomeNeg.trim()} onClick={() => void tarefa('neg', async () => { await updateBusiness(business!.id, { name: nomeNeg.trim(), segment: seg }); await refresh(); }, 'Negócio atualizado.')}>Salvar negócio</Button>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-extrabold">Preferências e notificações</h2>
        <label className="flex min-h-[48px] cursor-pointer items-center justify-between gap-4">
          <span><b>Alertas inteligentes</b><br /><span className="text-sm text-gray-600">Avisos de margem baixa, prejuízo e metas no painel.</span></span>
          <input type="checkbox" className="h-6 w-6 accent-roxo" checked={notif} onChange={(e) => setNotif(e.target.checked)} />
        </label>
        <Button variante="soft" carregando={ocupado === 'pref'} onClick={() => void tarefa('pref', async () => { await updateProfile(session!.user.id, { preferences: { notificacoes: notif } }); await refresh(); }, 'Preferências salvas.')}>Salvar preferências</Button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-extrabold">Plano e assinatura</h2>
        <p>Seu plano atual: <b className={plan === 'pro' ? 'text-roxo' : ''}>{plan === 'pro' ? 'PRO' : 'FREE'}</b></p>
        {plan === 'free' ? (
          <>
            <p className="text-gray-600">O plano FREE inclui até 3 produtos, calculadora básica e dashboard básico. O PRO libera produtos ilimitados, fichas técnicas, promoções, metas, canais, relatórios e exportação.</p>
            <Aviso tom="info">A contratação do plano PRO será liberada em breve.</Aviso>
          </>
        ) : <p className="text-gray-600">Você tem acesso a todos os recursos.</p>}
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-extrabold">Segurança</h2>
        <Field label="Nova senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} hint="Mínimo de 8 caracteres." />
        <Button variante="soft" carregando={ocupado === 'senha'} disabled={senha.length < 8} onClick={() => void tarefa('senha', async () => { const { error } = await supabase.auth.updateUser({ password: senha }); if (error) throw error; setSenha(''); }, 'Senha alterada.')}>Alterar senha</Button>
        <Button variante="ghost" onClick={() => void signOut()}>Sair da conta</Button>
      </section>

      <section className="card space-y-3 ring-1 ring-red-200">
        <h2 className="text-lg font-extrabold text-perigo">Excluir conta</h2>
        <p className="text-gray-700">Isso apaga sua conta e todos os seus dados (produtos, fichas, metas, promoções). Não é possível desfazer.</p>
        <Field label='Digite EXCLUIR para confirmar' value={confirma} onChange={(e) => setConfirma(e.target.value)} />
        <Button variante="danger" carregando={ocupado === 'del'} disabled={confirma !== 'EXCLUIR'} onClick={() => void tarefa('del', async () => { await deleteMyAccount(); await signOut(); }, 'Conta excluída.')}>Excluir minha conta</Button>
      </section>
    </div>
  );
}
