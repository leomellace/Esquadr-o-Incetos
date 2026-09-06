"use client";

import { useSyncExternalStore } from "react";

export type QualityTier = "high" | "low";

/**
 * Orçamento de performance da cena. O custo pesado não é a geometria
 * (tudo aqui é caixa arredondada procedural) — é o postprocessing e o
 * mapa de sombra, que num celular derrubam o framerate sozinhos.
 *
 * No tier baixo saem: bloom, contorno do cenário e metade da resolução
 * efetiva. A bomba mantém o contorno, porque é ela que carrega a
 * identidade visual — o cenário pode degradar sem o jogo parecer outro
 * jogo.
 *
 * O tier é medido UMA vez, antes do primeiro render do <Canvas>, e
 * nunca muda depois. Isso não é preciosismo: o <EffectComposer> assume
 * o laço de render do R3F enquanto está montado, e desmontá-lo depois
 * (que era o que acontecia quando o tier caía de "high" para "low" no
 * primeiro efeito) deixava o renderer sem desenhar — canvas do tamanho
 * certo, cena preta. Era esse o bug no celular.
 *
 * Pelo mesmo motivo não reavaliamos no resize: girar o telefone no meio
 * da partida não deveria reconstruir o renderer.
 */
function measure(): QualityTier {
  const narrow = window.innerWidth < 768;
  const fewCores =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  return narrow || (fewCores && coarsePointer) ? "low" : "high";
}

let cached: QualityTier | null = null;

function getSnapshot(): QualityTier {
  if (!cached) cached = measure();
  return cached;
}

function getServerSnapshot(): QualityTier {
  return "high";
}

function subscribe(): () => void {
  // Medição única: não há nada a que se inscrever.
  return () => {};
}

export function useQualityTier(): QualityTier {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
