// Protocolo de mensagens do canal Realtime `room:{code}`.
// Ver PLANO.md > Arquitetura de rede.

import type { Role } from "./database";

export interface BombSnapshot {
  seed: number;
  levelId: number | null;
  timeLeftMs: number;
  strikes: number;
  maxStrikes: number;
  modules: Record<string, unknown>;
}

export interface BombDelta {
  timeLeftMs: number;
  strikes: number;
  moduleId: string;
  modulePatch: unknown;
}

export type GestureKind =
  | "apontar"
  | "acenar"
  | "confuso"
  | "positivo"
  | "negativo"
  | "estapear"
  | "silencio";

export type RealtimeMessage =
  | { type: "state:snapshot"; from: string; payload: BombSnapshot }
  | { type: "state:delta"; from: string; payload: BombDelta }
  | {
      type: "input:action";
      from: string;
      payload: { moduleId: string; action: unknown; seq: number };
    }
  | {
      type: "comms:gesture";
      from: string;
      payload: { kind: GestureKind; targetX?: number; targetY?: number };
    }
  | { type: "rtc:signal"; from: string; to: string; payload: unknown };

export interface RoomPresenceMeta {
  profileId: string;
  displayName: string;
  role: Role | null;
  isReady: boolean;
  isHost: boolean;
}
