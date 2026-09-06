"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCurrentProfile } from "@/components/NameGate";
import { getBrowserClient } from "@/lib/supabase/client";
import { useGameChannel } from "@/lib/net/gameChannel";
import { generateBomb, applyBombAction, checkTimeExpired } from "@/lib/game/bomb";
import type { BombAction, BombConfig, BombState } from "@/lib/game/bomb";
import { logMatchEvent, finalizeMatch } from "@/lib/game/matchEvents";
import { syncServerClock, serverNow } from "@/lib/game/serverClock";
import { setRemoteHand } from "@/components/scene/handTracking";
import { Panel } from "@/components/ui/Panel";
import { ManualBook } from "@/components/ManualBook";
import { GestureWheel } from "@/components/GestureWheel";
import { VoiceBar } from "@/components/VoiceBar";
import { useVoice } from "@/lib/net/useVoice";
import { GESTURE_TTL_MS } from "@/lib/game/gestures";
import type { Database, Role } from "@/types/database";

// three.js não pode ser renderizado no servidor, e são ~600kB que não
// têm por que entrar no bundle de nenhuma outra rota.
const BombScene = dynamic(
  () => import("@/components/scene/BombScene").then((m) => m.BombScene),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center">
        <p className="animate-pulse font-mono text-sm text-cream-dim">montando a van...</p>
      </div>
    ),
  },
);

type RoomRow = Database["incetos"]["Tables"]["rooms"]["Row"];

/**
 * Sinal efêmero: onde a mão do Cego está. Não é estado de jogo, não
 * entra no log — se um pacote se perde, o próximo chega em 66ms.
 */
type HandSignal =
  | { kind: "hand"; x: number; y: number; z: number }
  | { kind: "gesture"; gesture: string; role: Role };

/**
 * O que cada papel precisa saber logo de cara. Não é decoração: sem
 * isso, o jogador do papel Cego acha que a tela quebrou, e o Surdo
 * fica clicando numa bomba que não responde.
 */
const ROLE_HUD: Record<Role | "espectador", { title: string; hint: string }> = {
  cego: {
    title: "🙈 Você é o Cego",
    hint: "Só você toca a bomba. Passe a mão para descobrir o que existe — e peça direção.",
  },
  surdo: {
    title: "🙉 Você é o Surdo",
    hint: "Você vê a bomba e a mão dele. Não pode tocar: guie por posição — 'mais à esquerda, sobe'.",
  },
  mudo: {
    title: "🙊 Você é o Mudo",
    hint: "Só você lê o manual. Não pode falar nem tocar — o manual traz a regra, não a resposta.",
  },
  espectador: {
    title: "Assistindo",
    hint: "Você não está entre os três desta sala.",
  },
};

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
  const [role, setRole] = useState<Role | "espectador" | null>(null);
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

      // O papel precisa ser conhecido ANTES do <Canvas> montar: ele
      // decide sombras e postprocessing, e trocar isso depois deixa o
      // renderer sem desenhar (mesma armadilha do tier de qualidade
      // na F5). Quem não é membro assiste como espectador.
      const { data: membership } = await supabase
        .from("room_members")
        .select("role")
        .eq("room_id", roomRow.id)
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (cancelled) return;
      setRole(membership?.role ?? "espectador");

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
  }, [code, router, profile.id]);

  if (loadError) {
    return (
      <div className="grid flex-1 place-items-center p-8">
        <Panel title="Ops" className="max-w-sm text-center">
          <p className="text-sm text-cream">{loadError}</p>
        </Panel>
      </div>
    );
  }

  if (!room || !matchId || startedAtMs === null || role === null) {
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
      role={role}
    />
  );
}

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
  role,
}: {
  room: RoomRow;
  matchId: string;
  startedAtMs: number;
  selfProfileId: string;
  role: Role | "espectador";
}) {
  const [now, setNow] = useState(0);
  const seqRef = useRef(0);
  const finalizedRef = useRef(false);
  // Gestos no ar. Estes SIM viram state: são poucos, esporádicos, e a
  // cena precisa re-renderizar para o balão aparecer.
  const [gestures, setGestures] = useState<Partial<Record<Role, { id: string; at: number }>>>({});

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

  const engine = useGameChannel<BombState, BombAction, HandSignal>({
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
    // A mão do Cego chega ~15x/s: vai direto para o store da cena, sem
    // passar por state do React. Gesto é raro e precisa de render.
    onSignal: (signal) => {
      if (signal.kind === "hand") {
        setRemoteHand(signal.x, signal.y, signal.z);
        return;
      }
      if (signal.kind === "gesture") {
        setGestures((prev) => ({
          ...prev,
          [signal.role]: { id: signal.gesture, at: serverNow() },
        }));
      }
    },
  });

  const { state: bomb, isHost } = engine;

  useEffect(() => {
    if (bomb.status === "armed" || !isHost || finalizedRef.current) return;
    finalizedRef.current = true;
    void finalizeMatch(matchId, room.id, bomb, serverNow());
  }, [bomb, isHost, matchId, room.id]);

  // Gesto tem prazo: some sozinho depois de GESTURE_TTL_MS. Filtrar na
  // renderização (em vez de agendar um timer por gesto) já basta,
  // porque `now` avança 10x/s de qualquer forma.
  const liveGestures = useMemo(() => {
    const out: Partial<Record<Role, { id: string; at: number }>> = {};
    for (const [seat, gesture] of Object.entries(gestures)) {
      if (gesture && now - gesture.at < GESTURE_TTL_MS) {
        out[seat as Role] = gesture;
      }
    }
    return out;
  }, [gestures, now]);

  // A voz é uma malha à parte do canal de jogo: mídia não passa pelo
  // host, e o que ela negocia (quem manda áudio para quem) é decidido
  // pelo papel, não pelo estado da partida.
  const voice = useVoice({ roomId: room.id, selfProfileId, role });

  function emitGesture(id: string) {
    if (role === "espectador") return;
    // Aparece na própria tela também: sem isso o jogador não sabe se o
    // gesto saiu, e acaba mandando três vezes.
    setGestures((prev) => ({ ...prev, [role]: { id, at: serverNow() } }));
    engine.sendSignal({ kind: "gesture", gesture: id, role });
  }

  const timeLeft = Math.max(0, bomb.config.timeLimitMs - (now - bomb.startedAtMs));
  const simon = bomb.modules[0];
  const simonState = simon.state as { sequenceLength: number; progress: number };
  const armed = bomb.status === "armed";

  // A regra central do jogo inteiro: SÓ o Cego toca a bomba. Os outros
  // dois enxergam (ou leem) e precisam falar. Se qualquer um pudesse
  // apertar, o jogo deixaria de existir — não haveria nada que forçasse
  // a conversa.
  const canTouch = armed && role === "cego";
  const blind = role === "cego";

  return (
    <main className="relative flex-1 overflow-hidden">
      {/* O canvas precisa de altura definida, não herdada de flex: o
          R3F mede o pai por ResizeObserver e um pai só com `flex-1`
          resolve altura percentual como zero. */}
      <div className="absolute inset-0">
        <BombScene
          role={role}
          timeLeftMs={timeLeft}
          strikes={bomb.strikes}
          maxStrikes={bomb.config.maxStrikes}
          simon={{
            progress: simonState.progress,
            sequenceLength: simonState.sequenceLength,
            solved: simon.solved,
          }}
          interactive={canTouch}
          onSimonPress={(buttonIndex) =>
            engine.sendAction({ moduleId: "simon", payload: { buttonIndex } })
          }
          onHandMove={
            blind
              ? (point) =>
                  engine.sendSignal({ kind: "hand", x: point.x, y: point.y, z: point.z })
              : undefined
          }
          gestures={liveGestures}
        />
      </div>

      {/* HUD por cima da cena. `pointer-events-none` no container para
          não roubar o clique dos botões 3D; só o que precisa de clique
          reativa o ponteiro. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-cream-dim/80 uppercase">
              Sala {room.code}
            </p>
            <p className="font-display text-lg font-semibold text-cream drop-shadow-[0_2px_0_var(--outline)]">
              {ROLE_HUD[role].title}
            </p>
            <p className="mt-0.5 max-w-[20rem] text-xs text-cream-dim">
              {ROLE_HUD[role].hint}
            </p>
          </div>

          <p className="rounded-lg border border-outline/60 bg-van-deep/70 px-2.5 py-1 font-mono text-[10px] text-cream-dim backdrop-blur-sm">
            {engine.isHost ? "host" : "peer"} · {engine.peers.length} na sala
          </p>
        </header>

        {/* O manual é do Mudo, e só dele. */}
        {role === "mudo" && (
          <div className="flex justify-center pb-2">
            <ManualBook pages={simon.manual} />
          </div>
        )}

        <footer className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <VoiceBar voice={voice} />
            <p className="font-mono text-[10px] text-cream-dim/70">
              {blind
                ? "sem cor, sem número, sem manual — pergunte"
                : "você não pode tocar na bomba"}
            </p>
          </div>
          <GestureWheel
            onGesture={emitGesture}
            active={role === "espectador" ? null : (liveGestures[role] ?? null)}
            disabled={role === "espectador"}
          />
        </footer>
      </div>

      {!armed && (
        <div className="absolute inset-0 grid place-items-center bg-van-deep/70 p-6 backdrop-blur-[3px]">
          <Panel
            title={bomb.status === "defused" ? "Bomba desarmada!" : "Bum."}
            screws
            className="max-w-xs text-center"
          >
            <p className="text-5xl">{bomb.status === "defused" ? "🎉" : "💥"}</p>
            <p className="mt-3 text-sm text-cream-dim">
              {bomb.strikes} erro(s) · {Math.ceil(timeLeft / 1000)}s no relógio
            </p>
          </Panel>
        </div>
      )}
    </main>
  );
}
