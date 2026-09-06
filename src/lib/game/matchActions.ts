import { getBrowserClient } from "@/lib/supabase/client";
import { RoomActionError } from "@/lib/game/roomActions";
import type { Database } from "@/types/database";

type RoomRow = Database["incetos"]["Tables"]["rooms"]["Row"];

/**
 * Só o host chama isso. Sobe `rooms.status` para 'in_progress' e cria
 * a linha de `matches` — os outros dois jogadores descobrem a mudança
 * pela mesma subscrição Realtime que já usam no lobby (F2) e navegam
 * sozinhos para `/partida/[code]`, sem precisar de nenhuma mensagem
 * dedicada de "a partida começou".
 */
export async function startMatch(room: RoomRow) {
  const supabase = getBrowserClient();

  const { error: roomError } = await supabase
    .from("rooms")
    .update({ status: "in_progress" })
    .eq("id", room.id);

  if (roomError) throw new RoomActionError(roomError.message);

  // level_id fica nulo até a F10 popular `campaign_levels` de verdade.
  const { error: matchError } = await supabase
    .from("matches")
    .insert({ room_id: room.id, level_id: null, seed: room.seed });

  if (matchError) throw new RoomActionError(matchError.message);
}
