import { rngInt } from "@/lib/game/rng";
import type { ModuleDef } from "./types";

/**
 * Primeira versão jogável do módulo "Simon" (nº2 do PLANO.md). A F9
 * vai plugar aqui as três visões (Surdo vê os botões coloridos,
 * Mudo lê a legenda no manual, Cego sente o clique) e os visuais de
 * verdade — esta é só a lógica: geração determinística e a regra de
 * acerto/erro, que não muda entre F4 e F9.
 */
export interface SimonState {
  sequenceLength: number;
  progress: number;
}

export type SimonSolution = number[];

export interface SimonAction {
  buttonIndex: 0 | 1 | 2 | 3;
}

export const simonModule: ModuleDef<SimonState, SimonSolution, SimonAction> = {
  id: "simon",

  generate: (rng, difficulty) => {
    const length = Math.min(3 + Math.floor(difficulty / 2), 8);
    const solution: SimonSolution = Array.from({ length }, () => rngInt(rng, 0, 3));

    return {
      state: { sequenceLength: length, progress: 0 },
      solution,
      manual: [
        {
          title: "Módulo Simon",
          body: `Sequência de ${length} botões. Quem vê a bomba dita a ordem das cores; um erro reinicia do zero.`,
        },
      ],
    };
  },

  reduce: (state, solution, action) => {
    const expected = solution[state.progress];

    if (action.buttonIndex !== expected) {
      return { state: { ...state, progress: 0 }, result: "strike" };
    }

    const progress = state.progress + 1;
    if (progress >= solution.length) {
      return { state: { ...state, progress }, result: "solved" };
    }
    return { state: { ...state, progress }, result: "progress" };
  },
};
