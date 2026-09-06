"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentProfile } from "@/components/NameGate";
import { getBrowserClient } from "@/lib/supabase/client";
import { useGameChannel } from "@/lib/net/gameChannel";
import { generateBomb, applyBombAction, checkTimeExpired } from "@/lib/game/bomb";
import type { BombAction, BombConfig, BombState } from "@/lib/game/bomb";
import { logMatchEvent, finalizeMatch } from "@/lib/game/matchEvents";
import { syncServerClock, serverNow } from "@/lib/game/serverClock";
import { Panel } from "@/components/ui/Panel";
import { ToyButton } from "@/components/ui/ToyButton";
import { LcdTimer } from "@/components/ui/LcdTimer";
import type { Database } from "@/types/database";

type RoomRow = Database["incetos"]["Tables"]["rooms"]["Row"];

// Sem UI de configuração ainda (isso é F10 — modo personalizado e
// campanha de verdade). Todo mundo joga a mesma bomba fixa por ora,
// só pra validar o motor: geração por seed, timer, strikes, fim de
// jogo. F9 troca isso por `campaign_levels`/config da sala.
const DEFAULT_CONFIG: Omit<BombConfig, "seed"> = {
  moduleIds: ["simon"],
  difficulty: 3,
  timeLimitMs: 120_000,
  maxStrikes: 3,
};

export default function PartidaPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const profile = useCurrentProfile();
  const router = useRouter();

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    let cancelled = false;

    async function load() {
      // Em paralelo: medir o offset de relógio não depende de nada
      // abaixo, e não vale a pena atrasar o carregamento da sala por
      // isso — o pior caso é o timer corrigir sozinho um instante
      // depois de aparecer na tela.
      void syncServerClock();

      const { data: roomRow, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (cancelled) return;
      if (roomError || !roomRow) {
        setLoadError("Sala não encontrada.");
        return;
      }
      if (roomRow.status === "lobby") {
        router.replace(`/sala/${code}`);
        return;
      }
      setRoom(roomRow);

      const { data: match } = await supabase
        .from("matches")
        .select("id, started_at")
        .eq("room_id", roomRow.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (!match) {
        setLoadError("Nenhuma partida encontrada para esta sala.");
        return;
      }
      setMatchId(match.id);
      setStartedAtMs(new Date(match.started_at).getTime());
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  if (loadError) {
    return (
      <div className="grid flex-1 place-items-center p-8">
        <Panel title="Ops" className="max-w-sm text-center">
          <p className="text-sm text-cream">{loadError}</p>
        </Panel>
      </div>
    );
  }

  if (!room || !matchId || startedAtMs === null) {
    return (
      <div className="grid flex-1 place-items-center p-8">
        <p className="animate-pulse font-mono text-sm text-cream-dim">carregando partida...</p>
      </div>
    );
  }

  return (
    <PartidaGame
      room={room}
      matchId={matchId}
      startedAtMs={startedAtMs}
      selfProfileId={profile.id}
    />
  );
}

const SIMON_LABELS = ["●", "▲", "■", "◆"] as const;

/**
 * Só monta depois que sala + partida + seed já são conhecidos — mesmo
 * motivo da F3: `useState(initialState)` só lê o valor inicial uma
 * vez, então gerar a bomba (que depende do seed real) precisa
 * acontecer ANTES do primeiro render deste componente, não dentro dele.
 */
function PartidaGame({
  room,
  matchId,
  startedAtMs,
  selfProfileId,
}: {
  room: RoomRow;
  matchId: string;
  startedAtMs: number;
  selfProfileId: string;
}) {
  const [now, setNow] = useState(0);
  const seqRef = useRef(0);
  const finalizedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 100);
    return () => clearInterval(id);
  }, []);

  // Memoizado: sem isso, `now` mudando 10x/s (o relógio de exibição)
  // re-renderiza PartidaGame e recomputaria a bomba inteira a cada
  // render — desperdício puro, já que o resultado é sempre idêntico
  // para o mesmo seed. useGameChannel só olha para este valor na
  // primeira montagem de qualquer forma (mesmo raciocínio da F3).
  const initialBomb = useMemo(
    () => generateBomb({ ...DEFAULT_CONFIG, seed: room.seed }, startedAtMs),
    [room.seed, startedAtMs],
  );

  const engine = useGameChannel<BombState, BombAction>({
    roomId: room.id,
    selfProfileId,
    initialState: initialBomb,
    tick: (state) => checkTimeExpired(state, serverNow()),
    onAction: (state, action, fromProfileId) => {
      const next = applyBombAction(state, action, serverNow());
      if (next !== state) {
        seqRef.current += 1;
        void logMatchEvent(matchId, fromProfileId, seqRef.current, action);
      }
      return next;
    },
  });

  const { state: bomb, isHost } = engine;

  useEffect(() => {
    if (bomb.status === "armed" || !isHost || finalizedRef.current) return;
    finalizedRef.current = true;
    void finalizeMatch(matchId, room.id, bomb, serverNow());
  }, [bomb, isHost, matchId, room.id]);

  const timeLeft = Math.max(0, bomb.config.timeLimitMs - (now - bomb.startedAtMs));
  const simon = bomb.modules[0];
  const simonState = simon.state as { sequenceLength: number; progress: number };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-cream-dim uppercase">
          Partida · {room.code}
        </p>
        <h1 className="font-display text-3xl font-bold text-cream">
          Bomba de teste (F4) — visão única, sem separar papéis ainda
        </h1>
        <p className="mt-1 text-sm text-cream-dim">
          A F6 vai esconder isso conforme o papel de cada um. Por ora todo mundo vê tudo, só pra
          validar o motor.
        </p>
      </header>

      {bomb.status !== "armed" && (
        <Panel
          title={bomb.status === "defused" ? "Bomba desarmada!" : "Bum."}
          className="text-center"
        >
          <p className="font-display text-3xl">{bomb.status === "defused" ? "🎉" : "💥"}</p>
          <p className="mt-2 text-sm text-cream-dim">
            {bomb.strikes} strike(s) · {Math.ceil(timeLeft / 1000)}s restantes quando terminou
          </p>
        </Panel>
      )}

      <Panel title="Visor">
        <LcdTimer ms={timeLeft} strikes={bomb.strikes} maxStrikes={bomb.config.maxStrikes} />
      </Panel>

      <Panel title={`Módulo Simon (${simonState.progress}/${simonState.sequenceLength})`}>
        <div className="flex flex-wrap gap-3">
          {SIMON_LABELS.map((label, index) => (
            <ToyButton
              key={index}
              size="lg"
              variant={(["banana", "alerta", "circuito", "cabo"] as const)[index]}
              disabled={bomb.status !== "armed" || simon.solved}
              onClick={() =>
                engine.sendAction({ moduleId: "simon", payload: { buttonIndex: index } })
              }
            >
              {label}
            </ToyButton>
          ))}
        </div>
        <p className="mt-4 text-sm text-cream-dim">{simon.manual[0].body}</p>
      </Panel>

      <Panel title="Motor de rede" className="text-sm">
        <dl className="grid grid-cols-2 gap-y-1">
          <dt className="text-cream-dim">Você é o host?</dt>
          <dd className="font-mono">{engine.isHost ? "sim" : "não"}</dd>
          <dt className="text-cream-dim">Peers</dt>
          <dd className="font-mono">{engine.peers.length}</dd>
        </dl>
      </Panel>
    </main>
  );
}
