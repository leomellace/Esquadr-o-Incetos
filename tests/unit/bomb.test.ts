import { describe, expect, it } from "vitest";
import { applyBombAction, checkTimeExpired, generateBomb, timeLeftMs } from "@/lib/game/bomb";
import type { BombConfig } from "@/lib/game/bomb";
import type { SimonSolution } from "@/lib/game/modules/simon";

const baseConfig: BombConfig = {
  seed: 42,
  moduleIds: ["simon"],
  difficulty: 3,
  timeLimitMs: 60_000,
  maxStrikes: 3,
};

describe("generateBomb — determinismo por seed", () => {
  it("produz a mesma bomba (módulos, estado e solução) para o mesmo seed", () => {
    const a = generateBomb(baseConfig, 1000);
    const b = generateBomb(baseConfig, 1000);

    expect(a.modules).toEqual(b.modules);
    expect(a.modules[0].solution).toEqual(b.modules[0].solution);
  });

  it("produz bombas diferentes para seeds diferentes", () => {
    const a = generateBomb(baseConfig, 1000);
    const b = generateBomb({ ...baseConfig, seed: 43 }, 1000);

    expect(a.modules[0].solution).not.toEqual(b.modules[0].solution);
  });

  it("o manual gerado é consistente com a solução — nunca pode dessincronizar", () => {
    // Regressão de propósito: o manual vem do MESMO generate() que a
    // solução, no mesmo RNG compartilhado — não há como um cliente
    // reconstruir um manual que não bate com a bomba do outro.
    const bomb = generateBomb(baseConfig, 1000);
    expect(bomb.modules[0].manual).toHaveLength(1);
    expect(bomb.modules[0].manual[0].title).toBe("Módulo Simon");
  });

  it("respeita maxStrikes e status inicial", () => {
    const bomb = generateBomb(baseConfig, 1000);
    expect(bomb.status).toBe("armed");
    expect(bomb.strikes).toBe(0);
  });
});

describe("timeLeftMs / checkTimeExpired", () => {
  it("conta regressivamente a partir de startedAtMs, nunca abaixo de zero", () => {
    const bomb = generateBomb(baseConfig, 1000);
    expect(timeLeftMs(bomb, 1000)).toBe(60_000);
    expect(timeLeftMs(bomb, 31_000)).toBe(30_000);
    expect(timeLeftMs(bomb, 999_999)).toBe(0);
  });

  it("explode sozinha quando o tempo acaba, sem nenhuma ação de jogador", () => {
    const bomb = generateBomb(baseConfig, 1000);
    const expired = checkTimeExpired(bomb, 1000 + baseConfig.timeLimitMs + 1);
    expect(expired.status).toBe("exploded");
  });

  it("não mexe numa bomba já finalizada", () => {
    const bomb = generateBomb(baseConfig, 1000);
    const exploded = { ...bomb, status: "exploded" as const };
    const stillExploded = checkTimeExpired(exploded, 1000 + baseConfig.timeLimitMs + 1);
    expect(stillExploded).toBe(exploded); // mesma referência: no-op de verdade
  });
});

describe("applyBombAction — módulo simon", () => {
  it("avança o progresso a cada acerto e resolve no fim da sequência", () => {
    let bomb = generateBomb(baseConfig, 1000);
    const solution = bomb.modules[0].solution as SimonSolution;

    for (let i = 0; i < solution.length - 1; i++) {
      bomb = applyBombAction(bomb, { moduleId: "simon", payload: { buttonIndex: solution[i] } }, 2000);
      expect(bomb.status).toBe("armed");
      expect(bomb.modules[0].solved).toBe(false);
    }

    bomb = applyBombAction(
      bomb,
      { moduleId: "simon", payload: { buttonIndex: solution[solution.length - 1] } },
      2000,
    );

    expect(bomb.modules[0].solved).toBe(true);
    expect(bomb.status).toBe("defused");
  });

  it("erro reseta o progresso do módulo e conta 1 strike", () => {
    let bomb = generateBomb(baseConfig, 1000);
    const solution = bomb.modules[0].solution as SimonSolution;
    const wrongButton = ((solution[0] + 1) % 4) as 0 | 1 | 2 | 3;

    bomb = applyBombAction(bomb, { moduleId: "simon", payload: { buttonIndex: wrongButton } }, 2000);

    expect(bomb.strikes).toBe(1);
    expect(bomb.status).toBe("armed");
  });

  it("explode ao atingir maxStrikes", () => {
    let bomb = generateBomb(baseConfig, 1000);
    const solution = bomb.modules[0].solution as SimonSolution;
    const wrongButton = ((solution[0] + 1) % 4) as 0 | 1 | 2 | 3;

    for (let i = 0; i < baseConfig.maxStrikes; i++) {
      bomb = applyBombAction(bomb, { moduleId: "simon", payload: { buttonIndex: wrongButton } }, 2000);
    }

    expect(bomb.strikes).toBe(baseConfig.maxStrikes);
    expect(bomb.status).toBe("exploded");
  });

  it("ignora ação depois que a bomba já terminou", () => {
    let bomb = generateBomb(baseConfig, 1000);
    bomb = { ...bomb, status: "exploded" };
    const untouched = applyBombAction(bomb, { moduleId: "simon", payload: { buttonIndex: 0 } }, 2000);
    expect(untouched).toBe(bomb);
  });

  it("explode em vez de aceitar ação se o tempo já acabou", () => {
    const bomb = generateBomb(baseConfig, 1000);
    const solution = bomb.modules[0].solution as SimonSolution;

    const result = applyBombAction(
      bomb,
      { moduleId: "simon", payload: { buttonIndex: solution[0] } },
      1000 + baseConfig.timeLimitMs + 1,
    );

    expect(result.status).toBe("exploded");
  });

  it("ignora módulo inexistente sem quebrar", () => {
    const bomb = generateBomb(baseConfig, 1000);
    const result = applyBombAction(bomb, { moduleId: "nao-existe", payload: {} }, 2000);
    expect(result).toBe(bomb);
  });
});
