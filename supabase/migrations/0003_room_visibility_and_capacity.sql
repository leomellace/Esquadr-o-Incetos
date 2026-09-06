-- Duas correções de RLS descobertas ao implementar o fluxo real de F2.
--
-- 1) "rooms_select_members" exigia ser membro para ENXERGAR a sala.
--    Isso quebra duas coisas ao mesmo tempo:
--      a) o host, logo após criar a sala, ainda não entrou em
--         room_members — o próprio INSERT...SELECT ficava cego.
--      b) um segundo jogador nunca consegue localizar a sala pelo
--         código para entrar, porque teria que já ser membro para
--         poder vê-la — impossível.
--    Correção: qualquer sala em 'lobby' é visível (é exatamente a
--    janela em que faz sentido alguém estar procurando por ela).
--    Depois que a partida começa ou termina, só membros a veem.
drop policy if exists "rooms_select_members" on incetos.rooms;

create policy "rooms_select_lobby_or_member" on incetos.rooms
  for select using (
    status = 'lobby' or incetos.is_room_member(id, auth.uid())
  );

-- 2) O limite de 3 jogadores por sala não pode ser garantido por um
--    SELECT count(*) no app: um jogador que ainda não é membro não
--    enxerga os membros existentes (mesma RLS), então a contagem
--    sempre voltava 0. Colocamos o limite onde ele é garantido de
--    verdade — um trigger no banco — em vez de confiar num
--    check-then-insert do cliente, que também teria uma corrida
--    entre dois jogadores entrando ao mesmo tempo.
create or replace function incetos.enforce_room_capacity()
returns trigger
language plpgsql
security definer
set search_path = incetos, public
as $$
begin
  if (select count(*) from incetos.room_members where room_id = new.room_id) >= 3 then
    raise exception 'room_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger room_members_capacity
  before insert on incetos.room_members
  for each row execute function incetos.enforce_room_capacity();
