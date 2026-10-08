import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase, mensagemErro } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Aviso, Button, Field, Logo, Rodape } from '../components/ui';

function Casca({ titulo, sub, children }: { titulo: string; sub?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-rosa-claro via-white to-lilas px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center"><Logo className="text-xl" /></Link>
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold">{titulo}</h1>
          {sub && <p className="mt-1 text-gray-600">{sub}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <Rodape className="mt-6 text-center" />
      </div>
    </div>
  );
}

function Google({ rotulo }: { rotulo: string }) {
  const [erro, setErro] = useState('');
  const ir = async () => {
    setErro('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/app` } });
    if (error) setErro('O login com Google ainda não está ativado neste app. Use e-mail e senha.');
  };
  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center gap-3 text-xs text-gray-500"><span className="h-px flex-1 bg-gray-200" />ou<span className="h-px flex-1 bg-gray-200" /></div>
      <Button type="button" variante="ghost" className="w-full" onClick={() => void ir()}>{rotulo}</Button>
      {erro && <p className="hint !text-perigo">{erro}</p>}
    </div>
  );
}

export function Login() {
  const { session, business } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  if (session) return <Navigate to={business ? '/app' : '/onboarding'} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(''); setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) setErro(mensagemErro(error));
    else nav('/app');
  };
  return (
    <Casca titulo="Que bom te ver de novo" sub="Entre para ver seus preços e lucros.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {erro && <Aviso tom="perigo">{erro}</Aviso>}
        <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        <Button type="submit" className="w-full" carregando={carregando} disabled={!email || !senha}>ENTRAR</Button>
        <p className="text-center text-sm"><Link className="font-bold text-roxo underline" to="/esqueci-senha">Esqueci minha senha</Link></p>
      </form>
      <Google rotulo="Entrar com Google" />
      <p className="mt-6 text-center text-sm text-gray-600">Ainda não tem conta? <Link className="font-bold text-rosa-escuro underline" to="/cadastro">Criar conta</Link></p>
    </Casca>
  );
}

export function Cadastro() {
  const { session, business } = useAuth();
  const nav = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  if (session) return <Navigate to={business ? '/app' : '/onboarding'} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    if (nome.trim().length < 2) return setErro('Informe seu nome.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.');
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password: senha,
      options: { data: { full_name: nome.trim() }, emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    setCarregando(false);
    if (error) return setErro(mensagemErro(error));
    if (data.session) nav('/onboarding');
    else setConfirmar(true);
  };

  if (confirmar)
    return (
      <Casca titulo="Confirme seu e-mail">
        <Aviso tom="ok">Enviamos um link para <b>{email}</b>. Clique nele para ativar sua conta e depois entre.</Aviso>
        <Link to="/entrar" className="btn-primary mt-5 w-full">IR PARA O LOGIN</Link>
      </Casca>
    );

  return (
    <Casca titulo="Crie sua conta" sub="Em poucos minutos você descobre quanto cobrar.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {erro && <Aviso tom="perigo">{erro}</Aviso>}
        <Field label="Seu nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} hint="Mínimo de 8 caracteres." required />
        <Button type="submit" className="w-full" carregando={carregando}>CRIAR MINHA CONTA</Button>
      </form>
      <Google rotulo="Cadastrar com Google" />
      <p className="mt-6 text-center text-sm text-gray-600">Já tem conta? <Link className="font-bold text-rosa-escuro underline" to="/entrar">Entrar</Link></p>
    </Casca>
  );
}

export function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(''); setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/redefinir-senha` });
    setCarregando(false);
    if (error) setErro(mensagemErro(error)); else setEnviado(true);
  };
  return (
    <Casca titulo="Recuperar senha" sub="Enviaremos um link para você criar uma nova senha.">
      {enviado ? (
        <Aviso tom="ok">Se existir uma conta com <b>{email}</b>, o link já está a caminho. Confira também o spam.</Aviso>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {erro && <Aviso tom="perigo">{erro}</Aviso>}
          <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" className="w-full" carregando={carregando} disabled={!email}>ENVIAR LINK</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link className="font-bold text-roxo underline" to="/entrar">Voltar ao login</Link></p>
    </Casca>
  );
}

export function RedefinirSenha() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.');
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) setErro(mensagemErro(error)); else nav('/app');
  };
  return (
    <Casca titulo="Crie uma nova senha">
      {!loading && !session ? (
        <Aviso tom="alerta">Este link expirou ou já foi usado. <Link className="underline" to="/esqueci-senha">Peça um novo</Link>.</Aviso>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {erro && <Aviso tom="perigo">{erro}</Aviso>}
          <Field label="Nova senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} hint="Mínimo de 8 caracteres." required />
          <Button type="submit" className="w-full" carregando={carregando}>SALVAR NOVA SENHA</Button>
        </form>
      )}
    </Casca>
  );
}

export function ConfigNecessaria() {
  return (
    <Casca titulo="Falta conectar o banco de dados">
      <p className="mb-3 text-gray-700">Crie um arquivo <code className="rounded bg-gray-100 px-1">.env</code> na raiz do projeto com:</p>
      <pre className="overflow-x-auto rounded-2xl bg-grafite p-4 text-xs text-white">{`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co\nVITE_SUPABASE_ANON_KEY=sua-anon-key`}</pre>
      <p className="mt-3 text-sm text-gray-600">Depois rode a migração <code>supabase/migrations/0001_schema.sql</code> e reinicie o servidor. O passo a passo completo está no README.</p>
    </Casca>
  );
}
