import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/game/rng";
import { simonModule, SIMON_COLORS } from "@/lib/game/modules/simon";
import { PLAY_COLOR_SPECS } from "@/lib/design/palette";

/**
 * A primeira versão deste módulo era insolúvel: gerava uma sequência
 * e não mostrava ela a ninguém, em lugar nenhum. Estes testes fixam a
 * garantia que corrigiu isso — a ordem é pública e o manual traz uma
 * tabela de verdade capaz de traduzi-la — para que ninguém a
 * reintroduza sem perceber.
 */

function generate(seed: number, difficulty = 3) {
  const rng = mulberry32(seed);
  return simonModule.generate(rng, difficulty);
}

describe("módulo Simon — solubilidade", () => {
  it("publica a sequência que pisca — não fica só na solução do host", () => {
    const { state } = generate(7);
    expect(state.flashSequence.length).toBeGreaterThan(0);
    for (const color of state.flashSequence) {
      expect(SIMON_COLORS).toContain(color);
    }
  });

  it("o manual traz uma tabela com as 4 cores, cada uma com um alvo", () => {
    const { manual } = generate(7);
    expect(manual).toHaveLength(1);
    for (const color of SIMON_COLORS) {
      expect(manual[0].body).toContain(PLAY_COLOR_SPECS[color].spoken);
    }
  });

  it("a tabela é um derangement — nenhuma forma aponta pra si mesma", () => {
    // Não só "nem todas iguais": NENHUMA linha pode ser óbvia sem o
    // manual, senão o Mudo aprende a arriscar sem consultar a tabela.
    // Roda várias seeds: a proteção em simon.ts só se prova testando
    // várias tentativas, não uma.
    for (let seed = 0; seed < 50; seed++) {
      const { manual } = generate(seed);
      for (const color of SIMON_COLORS) {
        const spoken = PLAY_COLOR_SPECS[color].spoken;
        const line = manual[0].body.split("\n").find((l) => l.startsWith(spoken));
        expect(line).not.toBe(`${spoken} → aperte o ${spoken}`);
      }
    }
  });

  it("a solução é reconstruível SÓ com o que é público (sequência + manual)", () => {
    const { state, solution, manual } = generate(11);

    // Reconstrói a tabela cor→alvo a partir do texto do manual, do
    // jeito que um jogador humano leria. Se isto não bater com a
    // solução do host, o manual mentiu para o Mudo.
    const table = new Map<string, number>();
    for (const color of SIMON_COLORS) {
      const spokenColor = PLAY_COLOR_SPECS[color].spoken;
      const line = manual[0].body
        .split("\n")
        .find((l) => l.startsWith(spokenColor));
      expect(line).toBeDefined();
      const targetSpoken = line!.split("→ aperte o ")[1];
      const target = SIMON_COLORS.find((c) => PLAY_COLOR_SPECS[c].spoken === targetSpoken);
      expect(target).toBeDefined();
      table.set(color, SIMON_COLORS.indexOf(target!));
    }

    const reconstructed = state.flashSequence.map((color) => table.get(color)!);
    expect(reconstructed).toEqual(solution);
  });

  it("é determinístico: mesma seed produz a mesma sequência e solução", () => {
    const a = generate(99);
    const b = generate(99);
    expect(a.state.flashSequence).toEqual(b.state.flashSequence);
    expect(a.solution).toEqual(b.solution);
  });
});
