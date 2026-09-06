import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/design/contrast";
import { CVD_MODES, PLAY_COLORS, type CvdMode } from "@/lib/design/palette";

// O teste lê o CSS de verdade em vez de uma cópia dos valores em TS.
// Se alguém mexer na paleta e esquecer da tinta, é aqui que quebra —
// que é exatamente o bug que apareceu no modo protanopia na F1.
const CSS = readFileSync(
  path.join(import.meta.dirname, "../../src/app/globals.css"),
  "utf-8",
);

function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[[\]"=]/g, (c) => `\\${c}`);
  const match = CSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Bloco não encontrado no CSS: ${selector}`);

  const vars: Record<string, string> = {};
  for (const [, name, value] of match[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[name] = value.trim();
  }
  return vars;
}

const SELECTORS: Record<CvdMode, string | null> = {
  none: null,
  protan_deutan: '[data-cvd="protan_deutan"]',
  tritan: '[data-cvd="tritan"]',
};

function paletteFor(mode: CvdMode): Record<string, string> {
  const base = block(":root");
  const resolved = { ...base, ...(SELECTORS[mode] ? block(SELECTORS[mode]) : {}) };

  // Resolve uma camada de var(): as tintas apontam para --outline / --cream.
  for (const [key, value] of Object.entries(resolved)) {
    const ref = value.match(/^var\(--([\w-]+)\)$/);
    if (ref) resolved[key] = resolved[ref[1]] ?? value;
  }
  return resolved;
}

describe("paleta de jogo", () => {
  it.each(CVD_MODES)("define todos os slots no modo %s", (mode) => {
    const palette = paletteFor(mode);
    for (const color of PLAY_COLORS) {
      expect(palette[`play-${color}`], `play-${color}`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette["ink-play"], "ink-play").toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  // 4.5:1 é o piso de AA para texto normal. Os glifos são grandes e
  // passariam com 3:1, mas eles carregam a informação inteira para quem
  // não distingue a cor — então cobramos o piso mais alto.
  it.each(CVD_MODES)("mantém glifo legível sobre a peça no modo %s", (mode) => {
    const palette = paletteFor(mode);
    for (const color of PLAY_COLORS) {
      const ratio = contrastRatio(palette[`play-${color}`], palette["ink-play"]);
      expect(ratio, `${color} em ${mode} — ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Peças coloridas ficam sobre o painel; precisam se destacar do fundo
  // como objeto, senão o Surdo perde a peça na cena antes de ler a cor.
  it.each(CVD_MODES)("separa a peça do painel no modo %s", (mode) => {
    const palette = paletteFor(mode);
    for (const color of PLAY_COLORS) {
      const ratio = contrastRatio(palette[`play-${color}`], palette.panel);
      expect(ratio, `${color} vs painel em ${mode} — ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });
});
