import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Calculator, ClipboardList, Gauge, Home, LayoutGrid, MoreHorizontal, Package, Percent, Settings, ShoppingBag, Tag, Target, TrendingUp } from 'lucide-react';
import { Logo, Rodape, BadgeDemo } from './ui';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';

const SIDEBAR = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/precificar', label: 'Precificar', icon: Calculator },
  { to: '/app/produtos', label: 'Produtos', icon: Package },
  { to: '/app/fichas', label: 'Fichas Técnicas', icon: ClipboardList },
  { to: '/app/promocoes', label: 'Promoções', icon: Tag },
  { to: '/app/metas', label: 'Metas', icon: Target },
  { to: '/app/canais', label: 'Canais', icon: ShoppingBag },
  { to: '/app/equilibrio', label: 'Ponto de Equilíbrio', icon: Gauge },
  { to: '/app/markup', label: 'Markup', icon: Percent },
  { to: '/app/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings },
];

const BOTTOM = [
  { to: '/app', label: 'Início', icon: Home, end: true },
  { to: '/app/precificar', label: 'Precificar', icon: Calculator },
  { to: '/app/produtos', label: 'Produtos', icon: Package },
  { to: '/app/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/app/mais', label: 'Mais', icon: MoreHorizontal },
];

export const MAIS_ITENS = [
  { to: '/app/fichas', label: 'Fichas Técnicas', icon: ClipboardList },
  { to: '/app/promocoes', label: 'Promoções', icon: Tag },
  { to: '/app/metas', label: 'Metas', icon: Target },
  { to: '/app/canais', label: 'Canais de venda', icon: ShoppingBag },
  { to: '/app/equilibrio', label: 'Ponto de Equilíbrio', icon: TrendingUp },
  { to: '/app/markup', label: 'Simulador de Markup', icon: Percent },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Layout() {
  const { business, plan, nome, signOut } = useAuth();
  const { modo, temDemo } = useProducts();
  const loc = useLocation();
  const maisAtivo = loc.pathname === '/app/mais' || MAIS_ITENS.some((i) => loc.pathname.startsWith(i.to));

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-black/5 bg-white p-4 lg:flex">
        <Logo className="mb-6 px-2 text-lg" />
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Menu principal">
          {SIDEBAR.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${isActive ? 'bg-lilas text-roxo' : 'text-gray-700 hover:bg-gray-50'}`}>
              <Icon className="h-5 w-5" aria-hidden />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-3 rounded-2xl bg-rosa-claro p-3 text-sm">
          <p className="truncate font-bold text-rosa-escuro">{business?.name}</p>
          <p className="truncate text-xs text-gray-600">{nome} · plano {plan === 'pro' ? 'PRO' : 'FREE'}</p>
          <button onClick={() => void signOut()} className="mt-2 text-xs font-bold text-roxo underline">Sair</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 lg:hidden">
          <Logo className="text-base" />
          <span className="max-w-[45%] truncate text-sm font-semibold text-gray-600">{business?.name}</span>
        </header>
        {modo === 'demo' && temDemo && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
            <BadgeDemo /> Você está vendo dados de demonstração — eles não são seus produtos reais.
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-12">
          <Outlet />
          <Rodape className="mt-12 border-t border-black/5 pt-4" />
        </main>
      </div>

      <nav className="pb-safe fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-black/5 bg-white lg:hidden" aria-label="Menu principal">
        {BOTTOM.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => {
            const ativo = to === '/app/mais' ? maisAtivo : isActive;
            return `flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${ativo ? 'text-roxo' : 'text-gray-600'}`;
          }}>
            <Icon className="h-6 w-6" aria-hidden />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function PaginaMais() {
  const { signOut } = useAuth();
  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold">Mais ferramentas</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {MAIS_ITENS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="card flex min-h-[64px] items-center gap-4 font-bold">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-lilas text-roxo"><Icon className="h-5 w-5" aria-hidden /></span>{label}
          </NavLink>
        ))}
        <button onClick={() => void signOut()} className="card flex min-h-[64px] items-center gap-4 text-left font-bold text-perigo">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50"><LayoutGrid className="h-5 w-5" aria-hidden /></span>Sair da conta
        </button>
      </div>
    </div>
  );
}
