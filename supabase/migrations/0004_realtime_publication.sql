-- Sem isso, escritas em `rooms`/`room_members` funcionam normalmente
-- (confirmado: um PATCH direto teve sucesso e persistiu), mas nenhum
-- outro jogador na sala recebe o evento — só veem a mudança se
-- recarregarem a página. Postgres Changes do Realtime só propaga
-- tabelas explicitamente adicionadas a essa publication; por padrão
-- ela só cobre o schema public.
alter publication supabase_realtime add table incetos.rooms;
alter publication supabase_realtime add table incetos.room_members;
