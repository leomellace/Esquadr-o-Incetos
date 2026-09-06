-- Corrige suposição errada da 0001: um jogador entra na sala ANTES de
-- escolher papel (F2), então `role` precisa aceitar NULL nesse intervalo.
--
-- Seguro: CHECK já aceita NULL (constraint só avalia valores não-nulos),
-- e UNIQUE (room_id, role) trata múltiplos NULLs como distintos — então
-- os três jogadores podem estar "sem papel" ao mesmo tempo sem violar
-- a exclusividade de papel escolhido.
alter table incetos.room_members
  alter column role drop not null;
