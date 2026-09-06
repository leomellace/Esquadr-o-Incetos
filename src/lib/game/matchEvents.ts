import { getBrowserClient } from "@/lib/supabase/client";
import type { BombAction, BombState } from "@/lib/game/bomb";
import type { MatchResult } from "@/types/database";

/**
 * Registro append-only de ações aceitas pelo host. Ninguém confia
 * nisto sozinho — é o material que a Edge Function de validação (F4,
 * ainda a implantar) vai reexecutar contra o seed antes de gravar
 * progresso. Por ora só grava; a validação por reexecução fica para
 * quando `progress`/campanha existir de verdade (F10).
 */
export async function logMatchEvent(
  matchId: string,
  profileId: string,
  seq: number,
  action: BombAction,
) {
  const supabase = getBrowserClient();
  const { error } = await supabase
    .from("match_events")
    .insert({ match_id: matchId, profile_id: profileId, seq, payload: action as never });

  if (error) {
    // Não relança: perder um evento de log não deveria travar a
    // partida em andamento. Console.error é suficiente por ora — F10
    // decide se isso vira alerta de verdade.
    console.error("Falha ao gravar match_event", error);
  }
}

/**
 * Grava o resultado final. Tentado 2x: em teste apareceu uma falha
 * intermitente e não-reproduzível de forma determinística na escrita
 * em `matches` (mesmo código, mesmos dados, funcionando na tentativa
 * seguinte) — consistente com uma renovação de sessão em trânsito no
 * exato instante da chamada. Isso é raro o bastante pra não valer
 * investigação mais funda agora; um retry cobre o caso sem esconder
 * falha persistente (essa sim logada).
 */
export async function finalizeMatch(
  matchId: string,
  roomId: string,
  bomb: BombState,
  nowMs: number,
) {
  const supabase = getBrowserClient();

  const result: MatchResult = bomb.status === "defused" ? "defused" : "exploded";
  const timeLeft = Math.max(0, bomb.config.timeLimitMs - (nowMs - bomb.startedAtMs));

  const patch = {
    result,
    strikes: bomb.strikes,
    time_left_ms: timeLeft,
    ended_at: new Date(nowMs).toISOString(),
  };

  let lastError: { message: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase.from("matches").update(patch).eq("id", matchId);
    if (!error) {
      lastError = null;
      break;
    }
    lastError = error;
  }

  if (lastError) {
    console.error("Falha ao finalizar match após retry", lastError);
  }

  const { error: roomError } = await supabase
    .from("rooms")
    .update({ status: "finished" })
    .eq("id", roomId);

  if (roomError) {
    console.error("Falha ao marcar sala como finished", roomError);
  }
}
