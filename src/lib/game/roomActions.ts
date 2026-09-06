import { getBrowserClient } from "@/lib/supabase/client";
import { generateRoomCode, normalizeRoomCode } from "@/lib/game/roomCode";
import { randomSeed } from "@/lib/game/rng";
import type { Role, RoomMode } from "@/types/database";

export class RoomActionError extends Error {}

const UNIQUE_VIOLATION = "23505";

/** Cria uma sala e já entra nela como host, sem papel escolhido ainda. */
export async function createRoom(hostId: string, mode: RoomMode) {
  const supabase = getBrowserClient();

  // Colisão de código de 6 chars em ~1B combinações é rara, mas a
  // constraint UNIQUE existe mesmo assim — tentamos de novo se bater.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({ code, host_id: hostId, mode, seed: randomSeed() })
      .select("*")
      .single();

    if (!error && room) {
      const { error: joinError } = await supabase
        .from("room_members")
        .insert({ room_id: room.id, profile_id: hostId });

      if (joinError && joinError.code !== UNIQUE_VIOLATION) {
        throw new RoomActionError(joinError.message);
      }

      return room;
    }

    if (error?.code !== UNIQUE_VIOLATION) {
      throw new RoomActionError(error?.message ?? "Não foi possível criar a sala.");
    }
  }

  throw new RoomActionError("Não foi possível gerar um código de sala único. Tente de novo.");
}

export async function joinRoomByCode(rawCode: string, profileId: string) {
  const supabase = getBrowserClient();
  const code = normalizeRoomCode(rawCode);

  if (code.length !== 6) {
    throw new RoomActionError("O código tem 6 letras/números.");
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new RoomActionError(error.message);
  if (!room) throw new RoomActionError("Sala não encontrada.");
  if (room.status !== "lobby") {
    throw new RoomActionError("Essa sala já começou ou terminou.");
  }

  const { data: existing } = await supabase
    .from("room_members")
    .select("profile_id")
    .eq("room_id", room.id)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!existing) {
    // A capacidade de 3 é garantida por trigger no banco (ver migration
    // 0003) — não por uma contagem prévia aqui, que teria uma corrida
    // entre dois jogadores entrando ao mesmo tempo.
    const { error: joinError } = await supabase
      .from("room_members")
      .insert({ room_id: room.id, profile_id: profileId });

    if (joinError) {
      if (joinError.message.includes("room_full")) {
        throw new RoomActionError("Essa sala já tem os três macacos.");
      }
      throw new RoomActionError(joinError.message);
    }
  }

  return room;
}

/** Troca o papel do jogador. Falha com clareza se outro já pegou o papel. */
export async function selectRole(roomId: string, profileId: string, role: Role) {
  const supabase = getBrowserClient();

  const { error } = await supabase
    .from("room_members")
    .update({ role })
    .eq("room_id", roomId)
    .eq("profile_id", profileId);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new RoomActionError("Esse papel acabou de ser escolhido por outro jogador.");
    }
    throw new RoomActionError(error.message);
  }
}

export async function setReady(roomId: string, profileId: string, isReady: boolean) {
  const supabase = getBrowserClient();

  const { error } = await supabase
    .from("room_members")
    .update({ is_ready: isReady })
    .eq("room_id", roomId)
    .eq("profile_id", profileId);

  if (error) throw new RoomActionError(error.message);
}

export async function leaveRoom(roomId: string, profileId: string) {
  const supabase = getBrowserClient();

  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("profile_id", profileId);

  if (error) throw new RoomActionError(error.message);
}
