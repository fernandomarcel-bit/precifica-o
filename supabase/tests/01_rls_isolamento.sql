\set VERBOSITY terse
grant all on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
insert into auth.users (id,email) values ('aaaaaaaa-0000-0000-0000-000000000001','a@x.com'),('bbbbbbbb-0000-0000-0000-000000000002','b@x.com');

-- helper: roda um comando como um usuário e informa se foi PERMITIDO (e quantas linhas) ou BLOQUEADO
create or replace function public.tentar(uid uuid, titulo text, cmd text) returns void language plpgsql as $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  begin
    execute cmd; get diagnostics n = row_count;
    raise notice '% -> PERMITIDO (% linhas)', titulo, n;
  exception when others then
    raise notice '% -> BLOQUEADO: %', titulo, sqlerrm;
  end;
  reset role;
end $$;
grant execute on function public.tentar(uuid,text,text) to public;

select tentar('aaaaaaaa-0000-0000-0000-000000000001','A cria negócio',$$insert into businesses (name,segment) values ('Doces da A','Confeitaria')$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B cria negócio',$$insert into businesses (name,segment) values ('Salgados do B','Salgados')$$);
select tentar('aaaaaaaa-0000-0000-0000-000000000001','A cria produto',$$insert into products (business_id,name,unidades_mes) select id,'Brigadeiro',200 from businesses$$);
select tentar('aaaaaaaa-0000-0000-0000-000000000001','A grava histórico do próprio produto',$$insert into pricing_calculations (product_id,input,result) select id,'{}','{}' from products$$);

select tentar('bbbbbbbb-0000-0000-0000-000000000002','B LÊ produtos de A',$$select * from products$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B LÊ histórico de A',$$select * from pricing_calculations$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B ALTERA produtos (de A)',$$update products set name='hackeado'$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B APAGA produtos (de A)',$$delete from products$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B ALTERA negócio de A',$$update businesses set name='hack' where owner_id='aaaaaaaa-0000-0000-0000-000000000001'$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B cria produto no negócio de A (owner B)',$$insert into products (business_id,name,unidades_mes) select id,'x',1 from businesses where owner_id='aaaaaaaa-0000-0000-0000-000000000001'$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B cria produto com owner_id=A no negócio de B',$$insert into products (business_id,name,unidades_mes,owner_id) select id,'x',1,'aaaaaaaa-0000-0000-0000-000000000001' from businesses where owner_id='bbbbbbbb-0000-0000-0000-000000000002'$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B grava histórico em produto de A',$$insert into pricing_calculations (product_id,input,result) select id,'{}','{}' from products$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B grava canal em produto de A',$$insert into sales_channels (product_id,canal,preco,lucro_liquido,margem) values ((select id from products limit 1),'x',1,1,1)$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B autopromove para PRO',$$update subscriptions set plan_id='pro'$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B insere assinatura PRO',$$insert into subscriptions (user_id,plan_id) values ('bbbbbbbb-0000-0000-0000-000000000002','pro')$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B lê assinatura (só a própria)',$$select * from subscriptions$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B lê perfis (só o próprio)',$$select * from profiles$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B tenta ligar enforce_plans',$$update app_settings set value='true'$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B apaga audit_logs',$$delete from audit_logs$$);
select tentar('bbbbbbbb-0000-0000-0000-000000000002','B lê audit_logs (de A)',$$select * from audit_logs$$);

select 'Produtos de A após ataques:' as info, count(*) , max(name) from products;
