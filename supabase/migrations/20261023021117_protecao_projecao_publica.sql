-- A leitura pública usa RLS e privilégios de coluna: respostas permanece privada.
alter view public.resultados_publicos set (security_invoker = true);
grant select (id, instituicao, nota_total, notas_dimensoes, quantidade_nao_sei, versao_questionario, criado_em)
  on public.diagnosticos to anon, authenticated;
create policy leitura_resumos_publicos on public.diagnosticos
  for select to anon, authenticated using (true);

-- As RPCs administrativas já são exclusivas de service_role. Não precisam
-- executar como proprietário: o papel do servidor tem apenas os grants usados.
grant usage on schema privado to service_role;
grant select, insert, update, delete, truncate on privado.limites, privado.envios to service_role;
grant truncate on public.diagnosticos to service_role;
grant execute on function privado.consumir_limite(text, integer, integer), privado.resumo(uuid) to service_role;
alter function privado.consumir_limite(text, integer, integer) security invoker;
alter function privado.resumo(uuid) security invoker;
alter function public.verificar_limite(text, boolean) security invoker;
alter function public.registrar_diagnostico(jsonb, uuid, text, text) security invoker;
alter function public.exportar_diagnosticos() security invoker;
alter function public.importar_diagnosticos(jsonb) security invoker;
alter function public.limpar_diagnosticos(text) security invoker;
create index envios_diagnostico_id_idx on privado.envios (diagnostico_id);
