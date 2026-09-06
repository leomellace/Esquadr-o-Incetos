"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Motor de jogo host-authoritative, genérico sobre o formato do estado.
 *
 * Vercel é serverless — não sustenta um loop de jogo de longa duração.
 * Em vez disso, UM dos clientes conectados (eleito por presença) roda o
 * tick e transmite o estado; os outros só recebem e renderizam. Se o
 * host cai, a presença detecta a saída e todo mundo reelege o próximo
 * em ~1 round-trip, sem coordenação central.
 *
 * Eleição determinística: o menor profileId entre os presentes vence.
 * Todo cliente calcula isso independentemente a partir do mesmo estado
 * de presença — ninguém precisa avisar ninguém "eu sou o host agora".
 *
 * Migração sem instrução do host antigo: TODO cliente — host ou não —
 * atualiza `stateRef` a cada broadcast recebido. Quando alguém vira
 * host no meio da partida, ele já tem uma cópia do estado com no
 * máximo `1000/broadcastHz` ms de atraso e continua o tick a partir
 * dali, em vez de reiniciar do zero.
 *
 * Ações (input:action do protocolo): quem não é host transmite a ação
 * via broadcast; o host aplica com `onAction` e redistribui o estado
 * resultante imediatamente, sem esperar o próximo tick agendado. Quem
 * É host aplica localmente sem round-trip.
 */
export interface GameChannelOptions<TState, TAction> {
  roomId: string;
  selfProfileId: string;
  initialState: TState;
  /** Chamado só no host, a cada tick. Deve ser puro. */
  tick: (state: TState, dtMs: number) => TState;
  /** Chamado só no host, quando alguém (inclusive ele mesmo) envia uma ação. */
  onAction?: (state: TState, action: TAction, fromProfileId: string) => TState;
  tickHz?: number;
  broadcastHz?: number;
}

export interface GameChannelResult<TState, TAction> {
  state: TState;
  isHost: boolean;
  hostId: string | null;
  peers: string[];
  connected: boolean;
  sendAction: (action: TAction) => void;
}

export function useGameChannel<TState, TAction = never>({
  roomId,
  selfProfileId,
  initialState,
  tick,
  onAction,
  tickHz = 20,
  broadcastHz = 10,
}: GameChannelOptions<TState, TAction>): GameChannelResult<TState, TAction> {
  const [state, setState] = useState(initialState);
  const [hostId, setHostId] = useState<string | null>(null);
  const [peers, setPeers] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  const stateRef = useRef(state);
  const hostIdRef = useRef<string | null>(null);
  const tickRef = useRef(tick);
  const onActionRef = useRef(onAction);
  const sendActionRef = useRef<(action: TAction) => void>(() => {});

  // Refs só podem ser escritas fora do render (React proíbe mutação
  // durante o render, inclusive pensando no React Compiler). Este
  // efeito roda depois de todo render e mantém as refs — lidas de
  // dentro de closures de longa duração no efeito de rede abaixo —
  // sempre com o valor mais recente de props/state.
  useEffect(() => {
    stateRef.current = state;
    tickRef.current = tick;
    onActionRef.current = onAction;
  });

  useEffect(() => {
    const supabase = getBrowserClient();

    // Canal público (sem Realtime Authorization): o nome do canal já
    // carrega o UUID da sala, não adivinhável, e o payload é só estado
    // de jogo efêmero — sem dado sensível. Reforçar com Authorization
    // fica para quando o jogo tiver algo realmente privado a proteger.
    const channel = supabase.channel(`match:${roomId}`, {
      config: { presence: { key: selfProfileId }, broadcast: { self: false } },
    });

    let tickInterval: ReturnType<typeof setInterval> | null = null;
    let broadcastCounter = 0;
    let lastTickAt = Date.now();
    const ticksPerBroadcast = Math.max(1, Math.round(tickHz / broadcastHz));

    function computeHost(): string | null {
      const ids = Object.keys(channel.presenceState());
      if (ids.length === 0) return null;
      return [...ids].sort()[0];
    }

    function stopHosting() {
      if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
      }
    }

    function broadcastState(next: TState) {
      channel.send({ type: "broadcast", event: "state", payload: next });
    }

    function startHosting() {
      if (tickInterval) return;
      lastTickAt = Date.now();
      tickInterval = setInterval(() => {
        const now = Date.now();
        const dt = now - lastTickAt;
        lastTickAt = now;

        const next = tickRef.current(stateRef.current, dt);
        stateRef.current = next;
        setState(next);

        broadcastCounter++;
        if (broadcastCounter >= ticksPerBroadcast) {
          broadcastCounter = 0;
          broadcastState(next);
        }
      }, 1000 / tickHz);
    }

    function reconcileHost() {
      const newHost = computeHost();
      const becameHost = newHost === selfProfileId && hostIdRef.current !== selfProfileId;
      hostIdRef.current = newHost;
      setHostId(newHost);
      setPeers(Object.keys(channel.presenceState()).sort());

      if (newHost === selfProfileId) {
        startHosting();
        // Acabou de assumir (primeira vez ou migração): publica logo
        // um snapshot em vez de esperar o próximo tick agendado, pra
        // quem estiver entrando agora não ficar olhando estado velho.
        if (becameHost) broadcastState(stateRef.current);
      } else {
        stopHosting();
      }
    }

    sendActionRef.current = (action: TAction) => {
      if (hostIdRef.current === selfProfileId) {
        if (!onActionRef.current) return;
        const next = onActionRef.current(stateRef.current, action, selfProfileId);
        stateRef.current = next;
        setState(next);
        broadcastState(next);
      } else {
        channel.send({
          type: "broadcast",
          event: "action",
          payload: { action, from: selfProfileId },
        });
      }
    };

    channel
      .on("broadcast", { event: "state" }, ({ payload }) => {
        stateRef.current = payload as TState;
        setState(payload as TState);
      })
      .on("broadcast", { event: "action" }, ({ payload }) => {
        if (hostIdRef.current !== selfProfileId || !onActionRef.current) return;
        const { action, from } = payload as { action: TAction; from: string };
        const next = onActionRef.current(stateRef.current, action, from);
        stateRef.current = next;
        setState(next);
        broadcastState(next);
      })
      .on("presence", { event: "sync" }, reconcileHost)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          await channel.track({ joinedAt: Date.now() });
        }
      });

    return () => {
      stopHosting();
      setConnected(false);
      supabase.removeChannel(channel);
    };
  }, [roomId, selfProfileId, tickHz, broadcastHz]);

  return {
    state,
    isHost: hostId === selfProfileId,
    hostId,
    peers,
    connected,
    sendAction: (action) => sendActionRef.current(action),
  };
}
