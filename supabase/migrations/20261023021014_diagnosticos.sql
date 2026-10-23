-- A tabela completa nunca é consultável pelos papéis públicos.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  instituicao varchar(120) not null check (char_length(instituicao) between 3 and 120),
  respostas jsonb not null check (jsonb_typeof(respostas) = 'object'),
  nota_total numeric(5,2) not null check (nota_total between 0 and 100),
  notas_dimensoes jsonb not null check (jsonb_typeof(notas_dimensoes) = 'object'),
  quantidade_nao_sei integer not null check (quantidade_nao_sei between 0 and 20),
  versao_questionario integer not null check (versao_questionario = 1),
  criado_em timestamptz not null default now()
);
create index diagnosticos_criado_em_idx on public.diagnosticos (criado_em desc, id);
create index diagnosticos_nota_total_idx on public.diagnosticos (nota_total desc);
alter table public.diagnosticos enable row level security;
revoke all on public.diagnosticos from public, anon, authenticated;
grant select, insert, update, delete on public.diagnosticos to service_role;

-- Projeção pública intencional: o proprietário lê a tabela protegida,
-- mas a view expõe exclusivamente as sete colunas autorizadas.
-- Não usar SELECT * nem incluir respostas nesta projeção.
create view public.resultados_publicos with (security_barrier = true) as
select id, instituicao, nota_total, notas_dimensoes, quantidade_nao_sei, versao_questionario, criado_em
from public.diagnosticos;
revoke all on public.resultados_publicos from public, anon, authenticated;
grant select on public.resultados_publicos to anon, authenticated, service_role;

create table privado.limites (
  chave text primary key,
  inicio timestamptz not null,
  quantidade integer not null
);
create table privado.envios (
  id_envio uuid primary key,
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  origem text not null,
  assinatura text not null,
  criado_em timestamptz not null default now()
);
create index envios_repetidos_idx on privado.envios (origem, assinatura, criado_em desc);
alter table privado.limites enable row level security;
alter table privado.envios enable row level security;
revoke all on all tables in schema privado from public, anon, authenticated;

create function privado.consumir_limite(p_chave text, p_maximo integer, p_segundos integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  insert into privado.limites as limites (chave, inicio, quantidade) values (p_chave, now(), 1)
  on conflict (chave) do update set
    inicio = case when limites.inicio <= now() - make_interval(secs => p_segundos) then now() else limites.inicio end,
    quantidade = case when limites.inicio <= now() - make_interval(secs => p_segundos) then 1 else limites.quantidade + 1 end
  returning quantidade into total;
  return total <= p_maximo;
end;
$$;
revoke all on function privado.consumir_limite(text, integer, integer) from public, anon, authenticated;

create function public.verificar_limite(p_origem text, p_administrativo boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  -- Também limita globalmente: o controle não depende apenas de cabeçalhos de IP.
  if not privado.consumir_limite(case when p_administrativo then 'admin:global' else 'envio:global' end, case when p_administrativo then 30 else 120 end, 60) then return false; end if;
  delete from privado.limites where inicio < now() - interval '1 day';
  delete from privado.envios where criado_em < now() - interval '1 day';
  return privado.consumir_limite((case when p_administrativo then 'admin:' else 'envio:' end) || p_origem, case when p_administrativo then 5 else 60 end, case when p_administrativo then 60 else 600 end);
end;
$$;
revoke all on function public.verificar_limite(text, boolean) from public, anon, authenticated;
grant execute on function public.verificar_limite(text, boolean) to service_role;

create function privado.resumo(p_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object('id', id, 'instituicao', instituicao, 'nota_total', nota_total,
    'notas_dimensoes', notas_dimensoes, 'quantidade_nao_sei', quantidade_nao_sei,
    'versao_questionario', versao_questionario, 'criado_em', criado_em)
  from public.diagnosticos where id = p_id;
$$;
revoke all on function privado.resumo(uuid) from public, anon, authenticated;

create function public.registrar_diagnostico(p_registro jsonb, p_id_envio uuid, p_origem text, p_assinatura text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare anterior privado.envios; novo uuid;
begin
  -- Mesma trava para envio, importação e limpeza: cada mutação é atômica.
  perform pg_advisory_xact_lock(731125430);
  select * into anterior from privado.envios where id_envio = p_id_envio;
  if found then
    if anterior.origem <> p_origem or anterior.assinatura <> p_assinatura then return jsonb_build_object('erro', 'conflito'); end if;
    return jsonb_build_object('diagnostico', privado.resumo(anterior.diagnostico_id), 'repetido', true);
  end if;
  if exists (select 1 from privado.envios where origem = p_origem and assinatura = p_assinatura and criado_em > now() - interval '30 seconds') then return jsonb_build_object('erro', 'repetido'); end if;
  insert into public.diagnosticos (instituicao, respostas, nota_total, notas_dimensoes, quantidade_nao_sei, versao_questionario)
  values (p_registro->>'instituicao', p_registro->'respostas', (p_registro->>'nota_total')::numeric, p_registro->'notas_dimensoes', (p_registro->>'quantidade_nao_sei')::integer, (p_registro->>'versao_questionario')::integer)
  returning id into novo;
  insert into privado.envios(id_envio, diagnostico_id, origem, assinatura) values (p_id_envio, novo, p_origem, p_assinatura);
  return jsonb_build_object('diagnostico', privado.resumo(novo), 'repetido', false);
end;
$$;
revoke all on function public.registrar_diagnostico(jsonb, uuid, text, text) from public, anon, authenticated;
grant execute on function public.registrar_diagnostico(jsonb, uuid, text, text) to service_role;

create function public.exportar_diagnosticos()
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'instituicao', instituicao,
    'respostas', respostas, 'versaoQuestionario', versao_questionario,
    'criadoEm', to_char(criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) order by criado_em, id), '[]'::jsonb)
  from public.diagnosticos;
$$;
revoke all on function public.exportar_diagnosticos() from public, anon, authenticated;
grant execute on function public.exportar_diagnosticos() to service_role;

create function public.importar_diagnosticos(p_registros jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare registro jsonb; importados integer := 0; inseridos integer;
begin
  if jsonb_typeof(p_registros) <> 'array' or jsonb_array_length(p_registros) > 5000 then raise exception 'Arquivo inválido'; end if;
  perform pg_advisory_xact_lock(731125430);
  for registro in select value from jsonb_array_elements(p_registros) loop
    insert into public.diagnosticos (id, instituicao, respostas, nota_total, notas_dimensoes, quantidade_nao_sei, versao_questionario, criado_em)
    values ((registro->>'id')::uuid, registro->>'instituicao', registro->'respostas', (registro->>'nota_total')::numeric, registro->'notas_dimensoes', (registro->>'quantidade_nao_sei')::integer, (registro->>'versao_questionario')::integer, (registro->>'criado_em')::timestamptz)
    on conflict (id) do nothing;
    get diagnostics inseridos = row_count;
    importados := importados + inseridos;
  end loop;
  return jsonb_build_object('importados', importados, 'ignorados', jsonb_array_length(p_registros) - importados);
end;
$$;
revoke all on function public.importar_diagnosticos(jsonb) from public, anon, authenticated;
grant execute on function public.importar_diagnosticos(jsonb) to service_role;

create function public.limpar_diagnosticos(p_confirmacao text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  if p_confirmacao is distinct from 'EXCLUIR TUDO' then raise exception 'Confirmação de exclusão inválida'; end if;
  perform pg_advisory_xact_lock(731125430);
  select count(*) into total from public.diagnosticos;
  truncate table privado.envios, privado.limites, public.diagnosticos;
  return jsonb_build_object('excluidos', total);
end;
$$;
revoke all on function public.limpar_diagnosticos(text) from public, anon, authenticated;
grant execute on function public.limpar_diagnosticos(text) to service_role;

-- Retorna uma única lista JSON para não sofrer truncamento pelo limite de linhas
-- do PostgREST. A projeção permanece restrita à view pública acima.
create function public.listar_resultados()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(resultado) order by resultado.criado_em desc, resultado.id), '[]'::jsonb)
  from public.resultados_publicos resultado;
$$;
revoke all on function public.listar_resultados() from public;
grant execute on function public.listar_resultados() to anon, authenticated, service_role;

