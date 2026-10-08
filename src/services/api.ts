import { supabase } from './supabase';
import { buildProductRow } from '../utils/mappers';
import { DEMO_PRODUCTS } from '../database/demo';
import { calcularPreco, type PricingInput, type PricingResult } from '../utils/pricing';
import type { Business, Goal, HistoryRow, PlanId, Product, Promotion, Recipe, RecipeIngredientRow, SalesChannelRow } from '../types';

type Ok<T> = { data: T | null; error: { message: string } | null };
async function run<T>(q: PromiseLike<Ok<T>>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as T;
}

/* ---------- Negócio / perfil / plano ---------- */
export const getBusiness = async (): Promise<Business | null> =>
  run<Business | null>(supabase.from('businesses').select('*').maybeSingle());

export const createBusiness = (b: { name: string; segment: string; main_goal: string }) =>
  run<Business>(supabase.from('businesses').insert(b).select().single());

export const updateBusiness = (id: string, patch: Partial<Pick<Business, 'name' | 'segment' | 'logo_url' | 'main_goal'>>) =>
  run<Business>(supabase.from('businesses').update(patch).eq('id', id).select().single());

export const getProfile = () =>
  run<{ id: string; full_name: string | null; preferences: { notificacoes?: boolean } }>(supabase.from('profiles').select('*').single());

export const updateProfile = async (userId: string, patch: { full_name?: string; preferences?: object }) => {
  await run(supabase.from('profiles').update(patch).eq('id', userId));
};

export async function getPlan(): Promise<{ plan: PlanId; status: string; periodEnd: string | null }> {
  const s = await run<{ plan_id: PlanId; status: string; current_period_end: string | null } | null>(
    supabase.from('subscriptions').select('plan_id,status,current_period_end').maybeSingle()
  );
  const ativo = s && (s.status === 'active' || s.status === 'trialing');
  return { plan: ativo ? s!.plan_id : 'free', status: s?.status ?? 'active', periodEnd: s?.current_period_end ?? null };
}

export async function uploadLogo(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Envie um arquivo de imagem.');
  if (file.size > 2 * 1024 * 1024) throw new Error('A imagem pode ter no máximo 2 MB.');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${userId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('logos').getPublicUrl(path).data.publicUrl;
}

export const deleteMyAccount = async () => {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
};

/* ---------- Produtos ---------- */
export const listProducts = () =>
  run<Product[]>(supabase.from('products').select('*').order('created_at', { ascending: false }));

export const getProduct = (id: string) => run<Product>(supabase.from('products').select('*').eq('id', id).single());

type Meta = { name: string; category: string | null; business_id: string; recipe_id?: string | null; is_demo?: boolean };

async function logHistory(productId: string, input: PricingInput, r: Extract<PricingResult, { ok: true }>) {
  await supabase.from('pricing_calculations').insert({
    product_id: productId,
    input,
    result: { precoRecomendado: r.precoRecomendado, lucroUnitario: r.lucroUnitario, margem: r.margem, custoTotal: r.custoTotal },
  });
}

export async function saveProduct(input: PricingInput, meta: Meta, id?: string): Promise<Product> {
  const r = calcularPreco(input); // recalcula SEMPRE aqui — nunca confia em número vindo da tela
  if (!r.ok) throw new Error(r.erros[0]);
  const row = buildProductRow(input, r, meta);
  const saved = id
    ? await run<Product>(supabase.from('products').update(row).eq('id', id).select().single())
    : await run<Product>(supabase.from('products').insert(row).select().single());
  await logHistory(saved.id, input, r);
  return saved;
}

export async function duplicateProduct(p: Product): Promise<Product> {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
  void _id; void _c; void _u;
  return run<Product>(supabase.from('products').insert({ ...rest, name: `${p.name} (cópia)` }).select().single());
}

export const deleteProduct = async (id: string) => {
  await run(supabase.from('products').delete().eq('id', id));
};

export async function loadDemo(businessId: string) {
  for (const d of DEMO_PRODUCTS) {
    await saveProduct(d.input, { name: d.name, category: d.category, business_id: businessId, is_demo: true });
  }
}
export const clearDemo = async () => {
  await run(supabase.from('products').delete().eq('is_demo', true));
};

export const listHistory = (productId: string) =>
  run<HistoryRow[]>(supabase.from('pricing_calculations').select('id,created_at,input,result').eq('product_id', productId).order('created_at', { ascending: false }).limit(20));

/* ---------- Fichas técnicas ---------- */
export const listRecipes = () => run<Recipe[]>(supabase.from('recipes').select('*').order('created_at', { ascending: false }));

export async function getRecipe(id: string): Promise<{ recipe: Recipe; ingredients: RecipeIngredientRow[] }> {
  const recipe = await run<Recipe>(supabase.from('recipes').select('*').eq('id', id).single());
  const ingredients = await run<RecipeIngredientRow[]>(supabase.from('recipe_ingredients').select('*').eq('recipe_id', id).order('posicao'));
  return { recipe, ingredients };
}

export async function saveRecipe(
  data: { name: string; category: string | null; rendimento: number; custo_total: number; custo_unitario: number; business_id: string },
  ingredients: RecipeIngredientRow[],
  id?: string
): Promise<Recipe> {
  const recipe = id
    ? await run<Recipe>(supabase.from('recipes').update(data).eq('id', id).select().single())
    : await run<Recipe>(supabase.from('recipes').insert(data).select().single());
  if (id) await run(supabase.from('recipe_ingredients').delete().eq('recipe_id', id));
  if (ingredients.length) {
    await run(
      supabase.from('recipe_ingredients').insert(
        ingredients.map((i, idx) => ({
          recipe_id: recipe.id, nome: i.nome, quantidade: i.quantidade, unidade: i.unidade,
          preco_compra: i.preco_compra, qtd_comprada: i.qtd_comprada, unidade_compra: i.unidade_compra, posicao: idx,
        }))
      )
    );
  }
  return recipe;
}
export const deleteRecipe = async (id: string) => {
  await run(supabase.from('recipes').delete().eq('id', id));
};

/* ---------- Promoções ---------- */
export const listPromotions = () => run<Promotion[]>(supabase.from('promotions').select('*').order('created_at', { ascending: false }));
export const savePromotion = (p: Omit<Promotion, 'id' | 'created_at'>) => run<Promotion>(supabase.from('promotions').insert(p).select().single());
export const deletePromotion = async (id: string) => {
  await run(supabase.from('promotions').delete().eq('id', id));
};

/* ---------- Metas ---------- */
export const listGoals = () => run<Goal[]>(supabase.from('goals').select('*').order('created_at', { ascending: false }));
export const saveGoal = (g: Omit<Goal, 'id' | 'created_at'> & { business_id: string }) => run<Goal>(supabase.from('goals').insert(g).select().single());
export const updateGoalRealizado = async (id: string, realizado: number) => {
  await run(supabase.from('goals').update({ realizado }).eq('id', id));
};
export const deleteGoal = async (id: string) => {
  await run(supabase.from('goals').delete().eq('id', id));
};

/* ---------- Canais ---------- */
export const listChannels = (productId?: string) => {
  const q = supabase.from('sales_channels').select('*, products(name,category)').order('created_at', { ascending: false });
  return run<(SalesChannelRow & { products?: { name: string; category: string | null } })[]>(productId ? q.eq('product_id', productId) : q);
};
export async function saveChannels(productId: string, rows: Omit<SalesChannelRow, 'id' | 'product_id'>[]) {
  await run(supabase.from('sales_channels').delete().eq('product_id', productId));
  if (rows.length) await run(supabase.from('sales_channels').insert(rows.map((r) => ({ ...r, product_id: productId }))));
}
