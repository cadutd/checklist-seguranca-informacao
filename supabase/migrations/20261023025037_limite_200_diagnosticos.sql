begin;
-- Serializa o contador na própria transação de cada INSERT/DELETE/TRUNCATE.
-- O trigger AFTER INSERT conta somente linhas inseridas, inclusive com ON CONFLICT.
lock table public.diagnosticos in access exclusive mode;
create table privado.capacidade (
  unico boolean primary key default true check (unico),
  total integer not null check (total between 0 and 200)
);
insert into privado.capacidade (unico, total)
select true, count(*)::integer from public.diagnosticos;
alter table privado.capacidade enable row level security;
revoke all on privado.capacidade from public, anon, authenticated;
grant select, update on privado.capacidade to service_role;

create function privado.atualizar_capacidade()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    update privado.capacidade set total = total + 1 where unico and total < 200;
    if not found then
      raise exception using errcode = 'P0200', message = 'Limite de 200 diagnósticos atingido. A operação não foi gravada.';
    end if;
  elsif TG_OP = 'DELETE' then
    update privado.capacidade set total = total - 1 where unico;
  elsif TG_OP = 'TRUNCATE' then
    update privado.capacidade set total = 0 where unico;
  end if;
  return null;
end;
$$;
revoke all on function privado.atualizar_capacidade() from public, anon, authenticated;
grant execute on function privado.atualizar_capacidade() to service_role;
create trigger capacidade_insercao after insert on public.diagnosticos
for each row execute function privado.atualizar_capacidade();
create trigger capacidade_exclusao after delete on public.diagnosticos
for each row execute function privado.atualizar_capacidade();
create trigger capacidade_limpeza after truncate on public.diagnosticos
for each statement execute function privado.atualizar_capacidade();

commit;
