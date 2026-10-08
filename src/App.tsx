import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProductsProvider } from './hooks/useProducts';
import { ToastProvider } from './hooks/useToast';
import { supabaseConfigured } from './services/supabase';
import Layout, { PaginaMais } from './components/Layout';
import { PaginaCarregando } from './components/ui';
import Landing from './pages/Landing';
import { Cadastro, ConfigNecessaria, EsqueciSenha, Login, RedefinirSenha } from './pages/AuthPages';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Precificar from './pages/Precificar';
import Produtos from './pages/Produtos';
import ProdutoDetalhe from './pages/ProdutoDetalhe';
import { FichaEditor, FichasLista } from './pages/Fichas';
import Promocoes from './pages/Promocoes';
import Metas from './pages/Metas';
import { Canais, Equilibrio, Markup } from './pages/Ferramentas';
import Configuracoes from './pages/Configuracoes';

const Relatorios = lazy(() => import('./pages/Relatorios')); // carrega jsPDF/xlsx só quando necessário

function Protegida({ children }: { children: ReactNode }) {
  const { session, loading, business } = useAuth();
  if (loading) return <PaginaCarregando />;
  if (!session) return <Navigate to="/entrar" replace />;
  if (!business) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  if (!supabaseConfigured) return <BrowserRouter><Routes><Route path="/" element={<Landing />} /><Route path="*" element={<ConfigNecessaria />} /></Routes></BrowserRouter>;
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/app" element={<Protegida><ProductsProvider><Layout /></ProductsProvider></Protegida>}>
              <Route index element={<Dashboard />} />
              <Route path="precificar" element={<Precificar />} />
              <Route path="precificar/:id" element={<Precificar />} />
              <Route path="produtos" element={<Produtos />} />
              <Route path="produtos/:id" element={<ProdutoDetalhe />} />
              <Route path="fichas" element={<FichasLista />} />
              <Route path="fichas/nova" element={<FichaEditor />} />
              <Route path="fichas/:id" element={<FichaEditor />} />
              <Route path="promocoes" element={<Promocoes />} />
              <Route path="metas" element={<Metas />} />
              <Route path="canais" element={<Canais />} />
              <Route path="equilibrio" element={<Equilibrio />} />
              <Route path="markup" element={<Markup />} />
              <Route path="relatorios" element={<Suspense fallback={<PaginaCarregando />}><Relatorios /></Suspense>} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="mais" element={<PaginaMais />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
