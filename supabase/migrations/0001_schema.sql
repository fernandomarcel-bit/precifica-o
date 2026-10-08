-- ============================================================
-- PRECIFICAÇÃO PRO — schema, RLS, regras de plano e auditoria
-- Rode no SQL Editor do Supabase (ou via `supabase db push`).
-- ============================================================
create extension if not exists pgcrypto;

-- ---------- Utilitários ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- Planos ----------
create table public.subscription_plans (
  id text primary key,
  name text not null,
  max_products int,                       -- null = ilimitado
  price_cents int not null default 0,
  features jsonb not null default '[]'::jsonb
);
insert into public.subscription_plans (id, name, max_products, price_cents, features) values
  ('free', 'FREE', 3, 0, '["calculadora_basica","dashboard_basico"]'),
  ('pro',  'PRO', null, 0, '["fichas","promocoes","metas","equilibrio","canais","relatorios","exportacao","analises"]');

-- Configuração global (liga/desliga bloqueio de plano no servidor)
create table public.app_settings (key text primary key, value text not null);
insert into public.app_settings values ('enforce_plans', 'false');

-- ---------- Perfil e assinatura ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  preferences jsonb not null default '{"notificacoes": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null default 'free' references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active','trialing','past_due','canceled')),
  provider text check (provider in ('kiwify','stripe','mercadopago')),
  provider_ref text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cria perfil + assinatura FREE no cadastro
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.subscriptions (user_id, plan_id) values (new.id, 'free');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_pro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from subscriptions s
    where s.user_id = auth.uid() and s.plan_id = 'pro' and s.status in ('active','trialing'));
$$;

create or replace function public.plans_enforced() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true' from app_settings where key = 'enforce_plans'), false);
$$;

-- ---------- Negócio ----------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  segment text not null check (segment in ('Confeitaria','Doceria','Salgados','Restaurante','Alimentação','Artesanato','Loja','Serviços','Outro')),
  main_goal text check (main_goal in ('descobrir_precos','aumentar_lucro','organizar_produtos','meta_faturamento')),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Fichas técnicas ----------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  category text,
  rendimento numeric(12,3) not null check (rendimento > 0),
  custo_total numeric(14,4) not null default 0 check (custo_total >= 0),
  custo_unitario numeric(14,4) not null default 0 check (custo_unitario >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  nome text not null,
  quantidade numeric(14,4) not null check (quantidade >= 0),
  unidade text not null check (unidade in ('g','kg','ml','l','un')),
  preco_compra numeric(14,4) not null check (preco_compra >= 0),
  qtd_comprada numeric(14,4) not null check (qtd_comprada > 0),
  unidade_compra text not null check (unidade_compra in ('g','kg','ml','l','un')),
  posicao int not null default 0
);

-- Catálogo de ingredientes (preparado para reaproveitar compras; sem tela ainda)
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  unidade text not null check (unidade in ('g','kg','ml','l','un')),
  preco_compra numeric(14,4) not null check (preco_compra >= 0),
  qtd_comprada numeric(14,4) not null check (qtd_comprada > 0),
  created_at timestamptz not null default now()
);

-- ---------- Produtos ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  category text,
  is_demo boolean not null default false,
  -- entradas
  materiais numeric(14,4) not null default 0 check (materiais >= 0),
  mao_de_obra numeric(14,4) not null default 0 check (mao_de_obra >= 0),
  embalagem numeric(14,4) not null default 0 check (embalagem >= 0),
  outros numeric(14,4) not null default 0 check (outros >= 0),
  frete numeric(14,4) not null default 0 check (frete >= 0),
  perdas_pct numeric(7,3) not null default 0 check (perdas_pct between 0 and 100),
  custos_fixos numeric(14,2) not null default 0 check (custos_fixos >= 0),
  unidades_mes numeric(12,2) not null check (unidades_mes > 0),
  impostos_pct numeric(7,3) not null default 0 check (impostos_pct between 0 and 100),
  taxas_pct numeric(7,3) not null default 0 check (taxas_pct between 0 and 100),
  comissao_pct numeric(7,3) not null default 0 check (comissao_pct between 0 and 100),
  margem_pct numeric(7,3) not null default 0 check (margem_pct >= 0 and margem_pct < 100),
  -- resultados (calculados no app pela biblioteca única de fórmulas)
  custo_variavel numeric(14,4) not null default 0,
  custo_total numeric(14,4) not null default 0,
  preco_minimo numeric(14,4) not null default 0,
  preco_recomendado numeric(14,4) not null default 0,
  lucro_unitario numeric(14,4) not null default 0,
  margem_real numeric(10,6) not null default 0,
  faturamento_mensal numeric(16,2) not null default 0,
  lucro_mensal numeric(16,2) not null default 0,
  status text not null default 'saudavel' check (status in ('saudavel','baixa','prejuizo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- regra de viabilidade validada TAMBÉM no banco
  constraint percentuais_viaveis check (impostos_pct + taxas_pct + comissao_pct + margem_pct < 100)
);
create index products_owner_idx on public.products(owner_id, created_at desc);

-- Limite do plano FREE (só vale quando enforce_plans = true; demonstração não conta)
create or replace function public.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare qtd int;
begin
  if new.is_demo or not plans_enforced() then return new; end if;
  if exists (select 1 from subscriptions s where s.user_id = new.owner_id and s.plan_id = 'pro' and s.status in ('active','trialing')) then
    return new;
  end if;
  select count(*) into qtd from products where owner_id = new.owner_id and not is_demo;
  if qtd >= 3 then
    raise exception 'LIMITE_FREE: o plano FREE permite até 3 produtos. Faça upgrade para o PRO.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger products_limit before insert on public.products
  for each row execute function public.enforce_product_limit();

-- Histórico de cálculos (histórico de alterações do produto)
create table public.pricing_calculations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table public.sales_channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  canal text not null,
  preco numeric(14,4) not null check (preco > 0),
  taxa_pct numeric(7,3) not null default 0 check (taxa_pct between 0 and 100),
  comissao_pct numeric(7,3) not null default 0 check (comissao_pct between 0 and 100),
  custo numeric(14,4) not null default 0 check (custo >= 0),
  lucro_liquido numeric(14,4) not null,
  margem numeric(10,6) not null,
  created_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  nome text not null,
  preco_normal numeric(14,4) not null check (preco_normal > 0),
  custo_unitario numeric(14,4) not null check (custo_unitario >= 0),
  desconto_pct numeric(7,3) not null check (desconto_pct between 0 and 100),
  taxas_pct numeric(7,3) not null default 0 check (taxas_pct >= 0 and taxas_pct < 100),
  preco_promocional numeric(14,4) not null,
  lucro_normal numeric(14,4) not null,
  lucro_promocional numeric(14,4) not null,
  margem_promocional numeric(10,6) not null,
  status text not null check (status in ('saudavel','atencao','prejuizo')),
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  mes date not null default date_trunc('month', now())::date,
  meta_faturamento numeric(16,2) not null check (meta_faturamento > 0),
  dias_venda int not null check (dias_venda between 1 and 31),
  preco_medio numeric(14,4) not null check (preco_medio > 0),
  custo_medio numeric(14,4) not null default 0 check (custo_medio >= 0),
  realizado numeric(16,2) not null default 0 check (realizado >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Preparadas para evolução (sem tela ainda)
create table public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  nome text not null,
  valor numeric(14,2) not null check (valor >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null,
  filtros jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.audit_products() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    -- Se o usuário está sendo apagado (cascade), não há a quem atribuir o log.
    if exists (select 1 from auth.users u where u.id = old.owner_id) then
      insert into audit_logs (owner_id, action, entity, entity_id, details) values (old.owner_id, 'delete', 'product', old.id, jsonb_build_object('name', old.name));
    end if;
    return old;
  end if;
  insert into audit_logs (owner_id, action, entity, entity_id, details)
    values (new.owner_id, lower(tg_op), 'product', new.id, jsonb_build_object('name', new.name, 'preco', new.preco_recomendado));
  return new;
end $$;
create trigger products_audit after insert or update or delete on public.products
  for each row execute function public.audit_products();

-- updated_at
create trigger t_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger t_businesses before update on public.businesses for each row execute function public.touch_updated_at();
create trigger t_products before update on public.products for each row execute function public.touch_updated_at();
create trigger t_recipes before update on public.recipes for each row execute function public.touch_updated_at();
create trigger t_goals before update on public.goals for each row execute function public.touch_updated_at();
create trigger t_subscriptions before update on public.subscriptions for each row execute function public.touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — cada usuário só enxerga/altera o que é seu
-- ============================================================
alter table public.subscription_plans enable row level security;
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.businesses enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.ingredients enable row level security;
alter table public.products enable row level security;
alter table public.pricing_calculations enable row level security;
alter table public.sales_channels enable row level security;
alter table public.promotions enable row level security;
alter table public.goals enable row level security;
alter table public.fixed_costs enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

-- Somente leitura para autenticados
create policy plans_read on public.subscription_plans for select to authenticated using (true);
create policy settings_read on public.app_settings for select to authenticated using (true);

-- Perfil: lê e edita o próprio
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Assinatura: o usuário SÓ lê. Alterações vêm de webhook/serviço (service_role). Ninguém se promove a PRO sozinho.
create policy subs_select on public.subscriptions for select to authenticated using (user_id = auth.uid());

-- Auditoria: só leitura do próprio histórico
create policy audit_select on public.audit_logs for select to authenticated using (owner_id = auth.uid());

-- Tabelas com owner_id: CRUD apenas do dono
do $$
declare t text;
begin
  foreach t in array array['businesses','recipes','ingredients','products','promotions','goals','fixed_costs','reports'] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (owner_id = auth.uid())', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (owner_id = auth.uid())', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (owner_id = auth.uid())', t, t);
  end loop;
end $$;

-- Tabelas filhas: além de ser dono, o pai referenciado também precisa ser do usuário
create policy ri_select on public.recipe_ingredients for select to authenticated using (owner_id = auth.uid());
create policy ri_insert on public.recipe_ingredients for insert to authenticated
  with check (owner_id = auth.uid() and exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()));
create policy ri_update on public.recipe_ingredients for update to authenticated using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()));
create policy ri_delete on public.recipe_ingredients for delete to authenticated using (owner_id = auth.uid());

create policy pc_select on public.pricing_calculations for select to authenticated using (owner_id = auth.uid());
create policy pc_insert on public.pricing_calculations for insert to authenticated
  with check (owner_id = auth.uid() and exists (select 1 from public.products p where p.id = product_id and p.owner_id = auth.uid()));
create policy pc_delete on public.pricing_calculations for delete to authenticated using (owner_id = auth.uid());

create policy sc_select on public.sales_channels for select to authenticated using (owner_id = auth.uid());
create policy sc_insert on public.sales_channels for insert to authenticated
  with check (owner_id = auth.uid() and exists (select 1 from public.products p where p.id = product_id and p.owner_id = auth.uid()));
create policy sc_update on public.sales_channels for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy sc_delete on public.sales_channels for delete to authenticated using (owner_id = auth.uid());

-- products/recipes: impede apontar para negócio/receita de outro usuário
create or replace function public.check_product_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from businesses b where b.id = new.business_id and b.owner_id = new.owner_id) then
    raise exception 'Negócio inválido.';
  end if;
  if new.recipe_id is not null and not exists (select 1 from recipes r where r.id = new.recipe_id and r.owner_id = new.owner_id) then
    raise exception 'Ficha técnica inválida.';
  end if;
  return new;
end $$;
create trigger products_refs before insert or update on public.products
  for each row execute function public.check_product_refs();

-- Regras PRO no servidor (só quando enforce_plans = true)
create or replace function public.require_pro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if plans_enforced() and not is_pro() then
    raise exception 'RECURSO_PRO: este recurso faz parte do plano PRO.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger recipes_pro before insert on public.recipes for each row execute function public.require_pro();
create trigger promotions_pro before insert on public.promotions for each row execute function public.require_pro();
create trigger goals_pro before insert on public.goals for each row execute function public.require_pro();
create trigger channels_pro before insert on public.sales_channels for each row execute function public.require_pro();

-- ---------- Excluir a própria conta (LGPD) ----------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  delete from auth.users where id = auth.uid();   -- cascade apaga todos os dados
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Storage: logos (pasta = id do usuário) ----------
insert into storage.buckets (id, name, public) values ('logos', 'logos', true) on conflict do nothing;
create policy logos_read on storage.objects for select using (bucket_id = 'logos');
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- recipes/goals/fixed_costs: o negócio referenciado precisa ser do próprio usuário
create or replace function public.check_business_ref() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from businesses b where b.id = new.business_id and b.owner_id = new.owner_id) then
    raise exception 'Negócio inválido.';
  end if;
  return new;
end $$;
create trigger recipes_biz before insert or update on public.recipes for each row execute function public.check_business_ref();
create trigger goals_biz before insert or update on public.goals for each row execute function public.check_business_ref();
create trigger fixed_costs_biz before insert or update on public.fixed_costs for each row execute function public.check_business_ref();
