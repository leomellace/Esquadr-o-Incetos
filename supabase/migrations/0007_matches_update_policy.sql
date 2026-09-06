-- A 0001 criou SELECT e INSERT para `matches`, mas nunca UPDATE — e é
-- exatamente isso que a F4 precisa pra gravar resultado/strikes/
-- tempo restante quando a bomba termina. Sem esta policy, RLS nega
-- por padrão (nenhuma policy = nenhuma linha atualizável).
--
-- Restrito ao host da sala (não a qualquer membro): é o host quem
-- roda o motor de rede e decide quando a partida terminou.
create policy "matches_update_host" on incetos.matches
  for update using (
    exists (
      select 1 from incetos.rooms r
      where r.id = room_id and r.host_id = auth.uid()
    )
  );
