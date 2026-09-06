"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentProfile } from "@/components/NameGate";
import { getBrowserClient } from "@/lib/supabase/client";
import { useGameChannel } from "@/lib/net/gameChannel";
import { Panel } from "@/components/ui/Panel";
import { ToyButton } from "@/components/ui/ToyButton";
import type { Database } from "@/types/database";

type RoomRow = Database["incetos"]["Tables"]["rooms"]["Row"];

/**
 * Estado mínimo pra provar o motor da F3 funcionando de ponta a ponta,
 * sem nenhuma lógica de bomba (isso é F4). Três coisas propositalmente
 * demonstradas aqui:
 *
 * - `startedAtMs` vem do banco (matches.started_at), não é acumulado
 *   em memória — então o cronômetro nunca "pula" numa migração de
 *   host, porque qualquer host recalcula o mesmo valor a partir da
 *   mesma âncora, em vez de continuar de onde o host anterior parou.
 * - `hostTickCount` só o host incrementa, a cada tick — prova que o
 *   loop está rodando e sendo transmitido (state:delta).
 * - `clickCount` só muda via `sendAction` — prova o caminho
 *   input:action de cliente pra host (F4 vai plugar o `reduce()` de
 *   cada módulo exatamente aqui).
 */
interface DemoState {
  startedAtMs: number;
  hostTickCount: number;
  clickCount: number;
}

type DemoAction = { type: "click" };

export default function PartidaPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const profile = useCurrentProfile();
  const router = useRouter();

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    let cancelled = false;

    async function load() {
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
        .select("started_at")
        .eq("room_id", roomRow.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      setStartedAtMs(match ? new Date(match.started_at).getTime() : Date.now());
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

  if (!room || startedAtMs === null) {
    return (
      <div className="grid flex-1 place-items-center p-8">
        <p className="animate-pulse font-mono text-sm text-cream-dim">carregando partida...</p>
      </div>
    );
  }

  return <PartidaGame room={room} startedAtMs={startedAtMs} selfProfileId={profile.id} />;
}

/**
 * Só monta (e só chama useGameChannel) depois que `startedAtMs` já
 * veio do banco. `useState(initialState)` presta atenção apenas na
 * primeira renderização — se o motor montasse antes do fetch
 * terminar, cada jogador ancorava o cronômetro num `Date.now()`
 * diferente (o do instante em que a própria aba carregou), e nem o
 * host corrigiria isso depois, porque o valor errado já teria virado
 * o estado local dele também.
 */
function PartidaGame({
  room,
  startedAtMs,
  selfProfileId,
}: {
  room: RoomRow;
  startedAtMs: number;
  selfProfileId: string;
}) {
  // Começa em 0 (puro) em vez de Date.now(): o relógio de parede real
  // só entra dentro do efeito, onde chamar uma função impura é permitido.
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const engine = useGameChannel<DemoState, DemoAction>({
    roomId: room.id,
    selfProfileId,
    initialState: { startedAtMs, hostTickCount: 0, clickCount: 0 },
    tick: (state) => ({ ...state, hostTickCount: state.hostTickCount + 1 }),
    onAction: (state, action) => {
      if (action.type === "click") return { ...state, clickCount: state.clickCount + 1 };
      return state;
    },
  });

  const elapsedS = Math.max(0, Math.floor((now - engine.state.startedAtMs) / 1000));
  const mm = String(Math.floor(elapsedS / 60)).padStart(2, "0");
  const ss = String(elapsedS % 60).padStart(2, "0");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-cream-dim uppercase">
          Partida · {room.code}
        </p>
        <h1 className="font-display text-3xl font-bold text-cream">
          Motor de rede (F3) — sem bomba ainda
        </h1>
      </header>

      <Panel title="Estado da conexão">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-cream-dim">Canal</dt>
          <dd className="font-mono">{engine.connected ? "conectado" : "conectando..."}</dd>

          <dt className="text-cream-dim">Você é o host?</dt>
          <dd className="font-mono">{engine.isHost ? "sim" : "não"}</dd>

          <dt className="text-cream-dim">Host atual</dt>
          <dd className="font-mono text-xs">{engine.hostId ?? "elegendo..."}</dd>

          <dt className="text-cream-dim">Peers no canal</dt>
          <dd className="font-mono">{engine.peers.length}</dd>
        </dl>
      </Panel>

      <Panel title="Cronômetro (âncora no banco, não no host)">
        <p className="font-mono text-5xl font-bold text-lcd">
          {mm}:{ss}
        </p>
        <p className="mt-2 text-sm text-cream-dim">
          Recalculado por qualquer host a partir de{" "}
          <code className="rounded bg-panel-hi px-1">matches.started_at</code> — se o host migrar,
          esse número não pula.
        </p>
      </Panel>

      <Panel title="Tick do host (state:delta)">
        <p className="font-mono text-3xl">{engine.state.hostTickCount}</p>
        <p className="mt-2 text-sm text-cream-dim">
          Só o host incrementa isso, 20x/s, e transmite 10x/s. Se o host cair, o próximo eleito
          continua a contagem de onde parou.
        </p>
      </Panel>

      <Panel title="Ação cliente → host (input:action)">
        <div className="flex items-center gap-4">
          <ToyButton variant="banana" onClick={() => engine.sendAction({ type: "click" })}>
            Jogar banana 🍌
          </ToyButton>
          <p className="font-mono text-2xl">{engine.state.clickCount}</p>
        </div>
        <p className="mt-2 text-sm text-cream-dim">
          Qualquer jogador pode clicar; só o host aplica a mudança e redistribui o resultado — é
          esse caminho que a F4 vai usar pra cortar cabo, apertar botão, etc.
        </p>
      </Panel>
    </main>
  );
}
