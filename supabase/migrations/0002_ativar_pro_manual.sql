-- Uso manual (SQL Editor) enquanto não há gateway de pagamento:
-- update public.subscriptions set plan_id = 'pro', status = 'active' where user_id = '<UUID_DO_USUARIO>';
--
-- Para ligar o bloqueio de plano no servidor:
-- update public.app_settings set value = 'true' where key = 'enforce_plans';
-- (e defina VITE_ENFORCE_PLANS=true no front)
select 1;
