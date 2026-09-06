-- A 0001 concedeu privilégios em `incetos` para anon/authenticated, mas
-- esqueceu service_role. Descoberto testando limpeza de dados de teste:
-- toda chamada com a service key retornava "permission denied for table"
-- (erro de GRANT, mais básico que RLS — service_role até ignora RLS, mas
-- ainda precisa do GRANT padrão do Postgres pra tocar na tabela).
--
-- Isso vai travar a Edge Function de validação de partida da F4, que
-- roda como service_role para reexecutar seed+log antes de gravar
-- progressão. Corrigindo agora que apareceu, antes de esquecer.
grant usage on schema incetos to service_role;
grant select, insert, update, delete on all tables in schema incetos to service_role;
alter default privileges in schema incetos grant select, insert, update, delete on tables to service_role;
