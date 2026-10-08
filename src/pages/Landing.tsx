import { Link } from 'react-router-dom';
import { BarChart3, Check, ChevronDown, ClipboardList, Gauge, ShoppingBag, Tag, Target, Wallet, X } from 'lucide-react';
import { Logo, Rodape } from '../components/ui';

const PROBLEMAS = ['Preço baseado no concorrente', 'Esquece embalagem', 'Não considera desperdícios', 'Ignora taxas', 'Não sabe o lucro real', 'Dá descontos sem calcular'];
const RECURSOS = [
  { i: Wallet, t: 'Precificação', d: 'Custos, taxas e margem viram o preço certo.' },
  { i: ClipboardList, t: 'Ficha Técnica', d: 'Custo exato de cada receita, por unidade.' },
  { i: Tag, t: 'Promoções', d: 'Veja quanto o desconto come do seu lucro.' },
  { i: Target, t: 'Metas', d: 'Quantas vendas por dia para chegar lá.' },
  { i: BarChart3, t: 'Dashboard', d: 'A saúde dos seus preços num só lugar.' },
  { i: Gauge, t: 'Ponto de Equilíbrio', d: 'Quanto vender para cobrir seus custos.' },
  { i: ShoppingBag, t: 'Canais de Venda', d: 'WhatsApp, iFood ou balcão: qual rende mais.' },
  { i: BarChart3, t: 'Relatórios', d: 'Exporte em PDF, CSV e Excel.' },
];
const PUBLICO = ['Confeiteiras e docerias', 'Salgadeiras', 'Pequenos restaurantes', 'Artesãos', 'Pequenos lojistas', 'MEIs e autônomos', 'Quem vende pelo WhatsApp e Instagram', 'Quem vende em marketplaces'];
const FAQ = [
  ['Preciso entender de finanças?', 'Não. Cada campo tem uma explicação simples, e o resultado aparece em tempo real enquanto você preenche.'],
  ['Funciona no celular?', 'Sim. O Precificação PRO foi pensado primeiro para o celular e pode ser instalado na tela inicial como um aplicativo.'],
  ['Meus dados ficam seguros?', 'Cada conta acessa somente os próprios dados, protegidos por autenticação e regras de acesso no banco de dados.'],
  ['Posso começar de graça?', 'Sim. O plano FREE permite até 3 produtos com a calculadora e o dashboard básicos. O plano PRO libera tudo, sem limite de produtos.'],
  ['A ferramenta substitui meu contador?', 'Não. Ela é de controle gerencial e formação de preços. Regras tributárias variam; consulte um contador quando precisar.'],
];

export default function Landing() {
  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo className="text-lg" />
        <nav className="flex items-center gap-2">
          <Link to="/entrar" className="btn-ghost !min-h-[44px]">Entrar</Link>
          <Link to="/cadastro" className="btn-primary !min-h-[44px] hidden sm:inline-flex">Criar conta</Link>
        </nav>
      </header>

      <section className="bg-gradient-to-b from-rosa-claro to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-bold text-rosa-escuro shadow-sm">Seu preço. Seu lucro. Seu negócio.</p>
            <h1 className="text-4xl font-extrabold leading-tight text-grafite sm:text-5xl">Descubra quanto cobrar e pare de vender no prejuízo.</h1>
            <p className="mt-4 max-w-lg text-lg text-gray-700">Calcule seus custos, preço ideal, margem e lucro em poucos minutos.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/cadastro" className="btn-primary px-8 text-base">COMEÇAR AGORA</Link>
              <a href="#como-funciona" className="btn-ghost px-8 text-base">COMO FUNCIONA</a>
            </div>
          </div>
          <MockDashboard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="max-w-2xl text-3xl font-extrabold">Você realmente sabe quanto custa o seu produto?</h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMAS.map((p) => (
            <li key={p} className="flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-4 font-semibold text-red-900"><X className="h-5 w-5 shrink-0 text-perigo" aria-label="Erro comum" />{p}</li>
          ))}
        </ul>
        <p className="mt-8 text-xl font-bold text-roxo">Com o Precificação PRO você transforma seus custos em decisões.</p>
      </section>

      <section id="como-funciona" className="bg-lilas/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-extrabold">Como funciona</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['1', 'Conte seus custos', 'Materiais, mão de obra, embalagem, taxas e custos fixos, em etapas simples.'],
              ['2', 'Veja o preço ideal', 'O resultado aparece em tempo real, com lucro, margem e um alerta se algo estiver errado.'],
              ['3', 'Decida com segurança', 'Simule promoções, metas e canais de venda e acompanhe tudo no painel.'],
            ].map(([n, t, d]) => (
              <li key={n} className="card"><span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-roxo font-extrabold text-white">{n}</span><p className="text-lg font-extrabold">{t}</p><p className="mt-1 text-gray-600">{d}</p></li>
            ))}
          </ol>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map(({ i: Icon, t, d }) => (
              <div key={t} className="card"><span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-rosa-claro text-rosa-escuro"><Icon className="h-5 w-5" aria-hidden /></span><p className="font-extrabold">{t}</p><p className="mt-1 text-sm text-gray-600">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold">Feito para pequenos negócios</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {PUBLICO.map((p) => <li key={p} className="flex items-center gap-3 font-semibold"><Check className="h-5 w-5 text-ok" aria-hidden />{p}</li>)}
        </ul>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="card"><p className="text-xl font-extrabold">FREE</p><ul className="mt-3 space-y-1 text-gray-700"><li>Até 3 produtos</li><li>Calculadora básica</li><li>Dashboard básico</li></ul></div>
          <div className="card ring-2 ring-roxo"><p className="text-xl font-extrabold text-roxo">PRO</p><ul className="mt-3 space-y-1 text-gray-700"><li>Produtos ilimitados</li><li>Fichas técnicas, promoções, metas, canais</li><li>Ponto de equilíbrio e relatórios com exportação</li></ul></div>
        </div>
      </section>

      <section className="bg-lilas/50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="mb-6 text-3xl font-extrabold">Perguntas frequentes</h2>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group card !p-0">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 font-bold">{q}<ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" aria-hidden /></summary>
                <p className="px-5 pb-5 text-gray-700">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-rosa-escuro to-roxo px-4 py-16 text-center text-white">
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold">COMECE A PRECIFICAR DO JEITO CERTO</h2>
        <Link to="/cadastro" className="btn mt-8 bg-white px-10 text-base text-rosa-escuro hover:bg-rosa-claro">COMEÇAR AGORA</Link>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Logo className="mb-3" />
        <Rodape />
      </footer>
    </div>
  );
}

function MockDashboard() {
  const barras = [60, 85, 45, 70, 95];
  return (
    <div className="rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-black/5" role="img" aria-label="Exemplo ilustrativo do painel do Precificação PRO">
      <p className="mb-3 text-xs font-bold text-gray-500">EXEMPLO ILUSTRATIVO</p>
      <div className="grid grid-cols-2 gap-3">
        {[['Faturamento projetado', 'R$ 8.360,00'], ['Lucro projetado', 'R$ 2.508,00'], ['Margem média', '30%'], ['Produtos', '5']].map(([a, b]) => (
          <div key={a} className="rounded-2xl bg-lilas/60 p-3"><p className="text-[11px] font-semibold text-gray-600">{a}</p><p className="text-lg font-extrabold">{b}</p></div>
        ))}
      </div>
      <div className="mt-3 flex h-28 items-end gap-3 rounded-2xl bg-rosa-claro/60 p-4">
        {barras.map((h, i) => <span key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-rosa-escuro to-rosa" style={{ height: `${h}%` }} />)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-green-50 px-3 py-1 text-ok">🟢 Margem saudável</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">🟡 Margem baixa</span>
        <span className="rounded-full bg-red-50 px-3 py-1 text-perigo">🔴 Risco de prejuízo</span>
      </div>
    </div>
  );
}
