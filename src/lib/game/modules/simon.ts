import { rngPick, rngShuffle } from "@/lib/game/rng";
import { PLAY_COLOR_SPECS, type PlayColor } from "@/lib/design/palette";
import type { ModuleDef } from "./types";

/**
 * Módulo "Simon" (nº2 do PLANO.md): sequência de botões, mapeamento
 * no manual.
 *
 * A primeira versão gerava uma sequência de botões e não mostrava ela
 * a ninguém — nem no estado público, nem no manual. Era insolúvel por
 * design: a única forma de "vencer" era tentativa e erro, porque a
 * informação simplesmente não existia em lugar nenhum que um jogador
 * pudesse ler.
 *
 * A correção segue o comentário que já estava em `ManualBook`: "quem
 * enxerga a bomba" (Surdo e Mudo, nunca o Cego) vê os LEDs piscando
 * em ordem — isso é `flashSequence`, público. O manual NUNCA traz essa
 * ordem; ele traz a REGRA — uma tabela cor-vista → botão-a-apertar.
 * Sem a tabela, ver a sequência não ajuda; sem a sequência, a tabela
 * não tem o que traduzir. As duas metades moram em jogadores
 * diferentes de propósito.
 *
 * O fluxo que isso produz usa os dois canais que a F7/F8 abriram: o
 * Surdo fala a forma em voz alta (ele tem voz, o Mudo tem ouvido); o
 * Mudo traduz pela tabela e responde por GESTO — os números 1–4 da
 * roda foram escritos pensando exatamente nisto (ver gestures.ts).
 */

/**
 * Ordem física dos botões no tabuleiro. Vive aqui, não em Simon3D: o
 * texto do manual (gerado aqui) e a geometria da cena (Simon3D) têm
 * que concordar sobre o que "o segundo botão" significa, e só há como
 * garantir isso com uma única fonte.
 */
export const SIMON_COLORS: PlayColor[] = ["banana", "alerta", "circuito", "cabo"];

export interface SimonState {
  progress: number;
  /**
   * A ordem em que os LEDs piscam — pública para quem enxerga a
   * bomba. NÃO é a resposta: é o que falta traduzir pela tabela do
   * manual.
   */
  flashSequence: PlayColor[];
}

/** Índice do botão físico correto (0–3, na ordem de SIMON_COLORS), passo a passo. */
export type SimonSolution = number[];

export interface SimonAction {
  buttonIndex: 0 | 1 | 2 | 3;
}

export const simonModule: ModuleDef<SimonState, SimonSolution, SimonAction> = {
  id: "simon",

  generate: (rng, difficulty) => {
    const length = Math.min(3 + Math.floor(difficulty / 2), 8);
    const flashSequence: PlayColor[] = Array.from({ length }, () => rngPick(rng, SIMON_COLORS));

    // Derangement completo — NENHUMA forma aponta pra si mesma, não
    // só "nem todas": uma tabela com uma linha "círculo → aperte o
    // círculo" deixa aquela linha óbvia sem o manual, e o Mudo aprende
    // rápido a arriscar sem olhar a tabela. Toda linha tem que exigir
    // a mesma tradução.
    let mapped = rngShuffle(rng, SIMON_COLORS);
    while (mapped.some((color, i) => color === SIMON_COLORS[i])) {
      mapped = rngShuffle(rng, SIMON_COLORS);
    }
    const targetOf = new Map(SIMON_COLORS.map((color, i) => [color, mapped[i]]));

    const solution: SimonSolution = flashSequence.map((color) =>
      SIMON_COLORS.indexOf(targetOf.get(color)!),
    );

    const table = SIMON_COLORS.map((color) => {
      const target = targetOf.get(color)!;
      return `${PLAY_COLOR_SPECS[color].spoken} → aperte o ${PLAY_COLOR_SPECS[target].spoken}`;
    }).join("\n");

    return {
      state: { progress: 0, flashSequence },
      solution,
      manual: [
        {
          title: "Módulo Simon",
          body:
            `Quem enxerga a bomba vê ${length} formas piscando em ordem, e dita cada uma em ` +
            `voz alta. Traduza pela tabela abaixo e responda por gesto qual botão apertar — ` +
            `um erro reinicia a sequência do zero.\n\n${table}`,
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
