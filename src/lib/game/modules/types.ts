import type { RNG } from "@/lib/game/rng";

/**
 * SDK de módulo — ver PLANO.md > Módulos. Cada módulo real (F9) só
 * precisa implementar isto; F4 só define o contrato e orquestra.
 *
 * `generate` roda uma vez, no host, a partir do RNG compartilhado do
 * PRNG da bomba — nunca de `Math.random()` — pra garantir que todo
 * cliente reconstrua exatamente o mesmo desafio a partir do mesmo
 * seed. A solução nunca trafega pela rede: só o `manual` (o que o
 * Mudo lê) e o `state` público (o que o Cego/Surdo veem) saem daqui;
 * a solução fica só na memória do host e é comparada localmente
 * dentro de `reduce`.
 */
export interface ManualPage {
  title: string;
  body: string;
}

export interface ModuleGenerated<TState, TSolution> {
  state: TState;
  solution: TSolution;
  manual: ManualPage[];
}

export type ModuleStepResult<TState> =
  | { state: TState; result: "progress" }
  | { state: TState; result: "solved" }
  | { state: TState; result: "strike" }
  | { state: TState; result: "noop" };

export interface ModuleDef<TState = unknown, TSolution = unknown, TAction = unknown> {
  id: string;
  generate: (rng: RNG, difficulty: number) => ModuleGenerated<TState, TSolution>;
  /** Só roda no host. Pura: mesmo (state, solution, action) sempre produz o mesmo resultado. */
  reduce: (state: TState, solution: TSolution, action: TAction) => ModuleStepResult<TState>;
}

/**
 * Tipo apagado usado só na fronteira do registry (src/lib/game/modules/registry.ts)
 * e do motor da bomba (src/lib/game/bomb.ts), onde módulos de tipos
 * concretos diferentes precisam conviver num mesmo mapa. Fora dessa
 * fronteira, sempre use o `ModuleDef<TState, TSolution, TAction>` concreto.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyModuleDef = ModuleDef<any, any, any>;
