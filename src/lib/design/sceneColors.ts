"use client";

import { useSyncExternalStore } from "react";
import { PLAY_COLORS, type PlayColor } from "@/lib/design/palette";

/**
 * Ponte entre o design system (F1) e a cena 3D (F5).
 *
 * As cores da cena são lidas das CSS custom properties em runtime, em
 * vez de duplicadas em hex aqui. Isso não é purismo: é o que faz a
 * bomba 3D trocar de paleta sozinha quando o jogador ativa um modo de
 * daltonismo — sem nenhum código de acessibilidade dentro da cena. O
 * `globals.css` continua sendo a única fonte de verdade, e o teste de
 * contraste da F1 continua guardando o que a cena mostra.
 */
export interface SceneColors {
  vanDeep: string;
  van: string;
  panel: string;
  panelHi: string;
  outline: string;
  cream: string;
  creamDim: string;
  lamp: string;
  lcd: string;
  lcdDim: string;
  lcdInk: string;
  play: Record<PlayColor, string>;
}

// Espelha os defaults de globals.css. Só entram em cena antes da
// hidratação (ou em teste sem DOM); no browser os valores reais
// sempre vêm do CSS.
const FALLBACK: SceneColors = {
  vanDeep: "#080c22",
  van: "#101740",
  panel: "#1c2760",
  panelHi: "#2b3a84",
  outline: "#050813",
  cream: "#f5efe0",
  creamDim: "#cfc5ae",
  lamp: "#ffb84d",
  lcd: "#7bd94a",
  lcdDim: "#4e9a2c",
  lcdInk: "#0d1a06",
  play: {
    banana: "#ffc93c",
    alerta: "#ff5647",
    circuito: "#2fd16d",
    cabo: "#4fa8ff",
    fio: "#c77cff",
  },
};

function readVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function readSceneColors(): SceneColors {
  if (typeof window === "undefined") return FALLBACK;

  const styles = getComputedStyle(document.documentElement);
  const play = {} as Record<PlayColor, string>;
  for (const color of PLAY_COLORS) {
    play[color] = readVar(styles, `--play-${color}`, FALLBACK.play[color]);
  }

  return {
    vanDeep: readVar(styles, "--van-deep", FALLBACK.vanDeep),
    van: readVar(styles, "--van", FALLBACK.van),
    panel: readVar(styles, "--panel", FALLBACK.panel),
    panelHi: readVar(styles, "--panel-hi", FALLBACK.panelHi),
    outline: readVar(styles, "--outline", FALLBACK.outline),
    cream: readVar(styles, "--cream", FALLBACK.cream),
    creamDim: readVar(styles, "--cream-dim", FALLBACK.creamDim),
    lamp: readVar(styles, "--lamp", FALLBACK.lamp),
    lcd: readVar(styles, "--lcd", FALLBACK.lcd),
    lcdDim: readVar(styles, "--lcd-dim", FALLBACK.lcdDim),
    lcdInk: readVar(styles, "--lcd-ink", FALLBACK.lcdInk),
    play,
  };
}

// O CSS computado é uma fonte externa ao React — não estado dele. Por
// isso useSyncExternalStore, e não useEffect + setState: o snapshot é
// lido na hora certa, sem um render extra a cada montagem, e a troca de
// modo de daltonismo chega pelo MutationObserver.
let snapshot: SceneColors | null = null;

function getSnapshot(): SceneColors {
  // Precisa ser referencialmente estável entre chamadas, senão o React
  // entende como mudança a cada render e entra em laço.
  if (!snapshot) snapshot = readSceneColors();
  return snapshot;
}

function getServerSnapshot(): SceneColors {
  return FALLBACK;
}

function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(() => {
    snapshot = readSceneColors();
    onStoreChange();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-cvd"],
  });

  return () => observer.disconnect();
}

/** Paleta da cena, seguindo o modo de daltonismo ativo (data-cvd na raiz). */
export function useSceneColors(): SceneColors {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
