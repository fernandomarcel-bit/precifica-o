# Precificação PRO
**Seu preço. Seu lucro. Seu negócio.** — SaaS de precificação para pequenos negócios (React + TypeScript + Tailwind + Supabase, PWA).

## Rodando em 5 passos
1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode `supabase/migrations/0001_schema.sql` (tabelas, RLS, triggers, storage).
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
4. Em **Authentication → URL Configuration**, adicione a URL do app (ex.: `http://localhost:5173` e a de produção) em *Site URL* e *Redirect URLs*.
5. `npm install && npm run dev`

Deploy: Vercel/Netlify (já há `vercel.json` e `public/_redirects` para as rotas do SPA). Defina as mesmas variáveis de ambiente.

## Comandos
| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | 47 testes (fórmulas e leitura de números) |
| `npm run build` | checa tipos + build de produção |

## Planos
- Todo cadastro nasce **FREE** (trigger no banco). O usuário **não consegue** se promover (não há policy de escrita em `subscriptions`).
- Por padrão **nada é bloqueado** (`VITE_ENFORCE_PLANS=false` e `app_settings.enforce_plans='false'`), para você testar tudo.
- Para ativar as regras do FREE (3 produtos; fichas/promoções/metas/canais só PRO): `update app_settings set value='true' where key='enforce_plans';` e `VITE_ENFORCE_PLANS=true`. Os limites são aplicados **no banco**, não só na tela. Produtos de demonstração não contam no limite.
- Liberar PRO manualmente: `update subscriptions set plan_id='pro' where user_id='<uuid>';`
- Pagamentos (Kiwify, Stripe, Mercado Pago): a tabela `subscriptions` já tem `provider`, `provider_ref` e `current_period_end`. Falta apenas um webhook (Edge Function com `service_role`) que atualize `plan_id`/`status`.

## Arquitetura
```
src/utils/pricing.ts   ← ÚNICO lugar com as fórmulas (puras e testadas)
src/utils/mappers.ts   linha do banco ↔ entrada das fórmulas
src/services/          supabase.ts (cliente/erros) e api.ts (todas as consultas)
src/hooks/             useAuth, useProducts, useToast
src/components/        ui.tsx, Layout, PricingForm, ResultadoPreco
src/pages/             Landing, AuthPages, Onboarding, Dashboard, Precificar, Produtos, ProdutoDetalhe,
                       Fichas, Promocoes, Metas, Ferramentas (Equilíbrio/Canais/Markup), Relatorios, Configuracoes
src/database/demo.ts   dados de DEMONSTRAÇÃO (gravados com is_demo=true)
supabase/migrations/   schema + RLS
supabase/tests/        testes de RLS rodáveis em Postgres local
```
Segurança: RLS em todas as tabelas (`owner_id = auth.uid()`); tabelas filhas conferem que o pai também é do usuário; `CHECK`s repetem as validações das fórmulas no banco (percentuais, unidades > 0, custos ≥ 0, soma < 100%); `saveProduct` **recalcula** os resultados no envio em vez de confiar na tela; exclusão de conta via função `delete_my_account()` (cascade).

## Tabelas
Criadas: `profiles` (dados do usuário; o login fica em `auth.users`), `businesses`, `products`, `recipes`, `recipe_ingredients`, `pricing_calculations`, `sales_channels`, `promotions`, `goals`, `subscriptions`, `subscription_plans`, `audit_logs`, `app_settings`.
Criadas e **ainda sem tela** (preparadas para evolução): `ingredients` (catálogo), `fixed_costs`, `reports`.
`product_costs` não existe como tabela separada: os custos ficam como colunas de `products` + histórico em `pricing_calculations`.

## Google login
Ative o provedor em Authentication → Providers → Google (Client ID/Secret do Google Cloud). O botão já existe e mostra aviso enquanto não estiver ativo.

## Limitações conhecidas
- O front não foi aberto em navegador nem rodado contra um projeto Supabase real neste ambiente: o que foi verificado é tipagem, build, 47 testes das fórmulas e a migração + RLS em PostgreSQL local. Faça o roteiro de teste manual abaixo antes de lançar.
- E-mails de confirmação/recuperação dependem do SMTP do Supabase (o padrão tem limite baixo por hora; configure um SMTP próprio para produção).
- Logos enviadas ficam no Storage mesmo após excluir a conta (os dados do banco são apagados).
- "Meta": o progresso usa o valor "já vendi neste mês" que o usuário informa (o app não registra vendas).

## Roteiro de teste manual (≈15 min)
Cadastro → e-mail → onboarding → criar produto (use o exemplo: 10/5/2/1, fixos 1.500, 200 un, 6%+3%, margem 30% ⇒ **R$ 41,80**, lucro **R$ 12,54**) → dashboard → editar/duplicar/excluir → ficha técnica → "enviar para precificação" → promoção → meta → equilíbrio → canais (salvar no produto) → relatórios + PDF/CSV/Excel → sair e entrar (dados persistem) → instalar no celular → segunda conta não vê nada da primeira.
