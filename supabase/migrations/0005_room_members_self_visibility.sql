-- Mesmo padrão da 0003, agora em room_members: um jogador entrando na
-- sala faz INSERT ... RETURNING na própria linha, mas a policy de
-- SELECT exigia already ser membro (is_room_member) para enxergar
-- qualquer linha de room_members — impossível no instante exato do
-- primeiro insert. Um jogador sempre pode ver a própria linha; ver as
-- dos outros continua exigindo ser membro da mesma sala.
drop policy if exists "room_members_select_same_room" on incetos.room_members;

create policy "room_members_select_self_or_same_room" on incetos.room_members
  for select using (
    auth.uid() = profile_id or incetos.is_room_member(room_id, auth.uid())
  );
