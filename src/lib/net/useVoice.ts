"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { VoiceMesh, voicePolicy, type VoicePolicy, type VoiceSnapshot } from "./voiceMesh";
import type { Role } from "@/types/database";

const SERVER_SNAPSHOT: VoiceSnapshot = {
  micState: "off",
  transmitting: false,
  level: 0,
  speaking: [],
  connected: [],
  error: null,
};

export interface UseVoiceResult extends VoiceSnapshot {
  policy: VoicePolicy;
  enableMic: () => void;
  disableMic: () => void;
  setTransmitting: (on: boolean) => void;
}

/**
 * Cola fina entre o `VoiceMesh` e o React.
 *
 * O motor mora fora da árvore e a UI só assina o que ele publica —
 * `useSyncExternalStore` em vez de estado espelhado. É o que impede que
 * um medidor de volume rodando a 10 Hz vire 10 renders por segundo da
 * cena 3D inteira, que é o custo real de fazer isso com `useState`.
 *
 * A instância nasce uma vez e não acompanha mudança de `role`: a
 * direção da mídia é decidida na negociação, então trocar de papel no
 * meio exigiria refazer o SDP dos dois lados. Na prática o papel já
 * está fixo antes desta tela montar — quem mudar isso precisa remontar
 * o componente (`key={role}`), não mutar a instância.
 */
export function useVoice({
  roomId,
  selfProfileId,
  role,
}: {
  roomId: string;
  selfProfileId: string;
  role: Role | "espectador" | null;
}): UseVoiceResult {
  const [mesh] = useState(() => new VoiceMesh({ roomId, selfProfileId, role }));

  useEffect(() => {
    mesh.start();
    return () => mesh.stop();
  }, [mesh]);

  const snapshot = useSyncExternalStore(mesh.subscribe, mesh.getSnapshot, () => SERVER_SNAPSHOT);

  const enableMic = useCallback(() => void mesh.enableMic(), [mesh]);
  const disableMic = useCallback(() => mesh.disableMic(), [mesh]);
  const setTransmitting = useCallback((on: boolean) => mesh.setTransmitting(on), [mesh]);

  return {
    ...snapshot,
    policy: voicePolicy(role),
    enableMic,
    disableMic,
    setTransmitting,
  };
}
