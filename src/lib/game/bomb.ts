import { mulberry32 } from "@/lib/game/rng";
import { getModuleDef } from "@/lib/game/modules/registry";
import type { ManualPage } from "@/lib/game/modules/types";

export interface BombConfig {
  seed: number;
  moduleIds: string[];
  difficulty: number;
  timeLimitMs: number;
  maxStrikes: number;
}

export interface BombModuleRuntime {
  moduleId: string;
  /** Estado público — o que Cego e Surdo enxergam (cada um à sua forma). */
  state: unknown;
  /** Nunca deveria sair do host pra ninguém; existe aqui só pra `reduce` comparar. */
  solution: unknown;
  manual: ManualPage[];
  solved: boolean;
}

export type BombStatus = "armed" | "defused" | "exploded";

export interface BombState {
  config: BombConfig;
  /** Âncora no relógio de parede (epoch ms) — igual ao padrão da F3.
   *  O tempo restante é sempre recalculado a partir daqui, nunca
   *  acumulado em memória, pra uma migração de host não fazer o
   *  cronômetro pular. */
  startedAtMs: number;
  modules: BombModuleRuntime[];
  strikes: number;
  status: BombStatus;
}

export interface BombAction {
  moduleId: string;
  payload: unknown;
}

/**
 * Gera a bomba a partir do seed. Mesmo seed + mesma config = mesma
 * bomba, byte a byte, em qualquer cliente — é essa garantia que faz
 * o manual do Mudo (gerado aqui) nunca dessincronizar da bomba real
 * que o Surdo vê, sem precisar transmitir o desafio pela rede.
 */
export function generateBomb(config: BombConfig, startedAtMs: number): BombState {
  const rng = mulberry32(config.seed);

  const modules: BombModuleRuntime[] = config.moduleIds.map((moduleId) => {
    const def = getModuleDef(moduleId);
    const { state, solution, manual } = def.generate(rng, config.difficulty);
    return { moduleId, state, solution, manual, solved: false };
  });

  return { config, startedAtMs, modules, strikes: 0, status: "armed" };
}

export function timeLeftMs(bomb: BombState, nowMs: number): number {
  return Math.max(0, bomb.config.timeLimitMs - (nowMs - bomb.startedAtMs));
}

/** Chamado a cada tick do host — só o timer pode explodir a bomba sem nenhuma ação. */
export function checkTimeExpired(bomb: BombState, nowMs: number): BombState {
  if (bomb.status === "armed" && timeLeftMs(bomb, nowMs) <= 0) {
    return { ...bomb, status: "exploded" };
  }
  return bomb;
}

/**
 * Aplica a ação de um jogador num módulo específico. Só o host chama
 * isto (via `onAction` do motor de rede da F3) — é aqui que
 * PLANO.md > input:action vira de fato mudança de estado.
 */
export function applyBombAction(bomb: BombState, action: BombAction, nowMs: number): BombState {
  if (bomb.status !== "armed") return bomb;
  if (timeLeftMs(bomb, nowMs) <= 0) return { ...bomb, status: "exploded" };

  const index = bomb.modules.findIndex((m) => m.moduleId === action.moduleId);
  if (index === -1) return bomb;

  const runtime = bomb.modules[index];
  if (runtime.solved) return bomb;

  const def = getModuleDef(runtime.moduleId);
  const step = def.reduce(runtime.state, runtime.solution, action.payload);

  if (step.result === "noop") return bomb;

  const modules = [...bomb.modules];
  modules[index] = { ...runtime, state: step.state, solved: step.result === "solved" };

  const strikes = bomb.strikes + (step.result === "strike" ? 1 : 0);
  const allSolved = modules.every((m) => m.solved);

  let status: BombStatus = bomb.status;
  if (strikes >= bomb.config.maxStrikes) status = "exploded";
  else if (allSolved) status = "defused";

  return { ...bomb, modules, strikes, status };
}
