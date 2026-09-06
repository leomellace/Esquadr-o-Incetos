-- Sincronização de relógio cliente/servidor (F4) precisa do horário
-- atual do servidor no CORPO da resposta, não num header — o browser
-- não expõe o header `Date` em respostas cross-origin por padrão
-- (não está na lista de "simple response headers" do CORS, e o
-- Supabase não configura Access-Control-Expose-Headers pra ele).
-- Uma função RPC banal resolve sem precisar mexer em CORS.
create or replace function incetos.server_time_ms()
returns bigint
language sql
stable
as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint;
$$;

grant execute on function incetos.server_time_ms() to anon, authenticated;
