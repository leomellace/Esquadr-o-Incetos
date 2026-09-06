"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Onde está a mão do Cego.
 *
 * É a informação mais importante que trafega entre os três jogadores, e
 * não é estado de jogo: é gesto. Por isso não passa pelo redutor da
 * bomba nem pelo log de eventos — seria gravar 15 linhas por segundo de
 * "o dedo está aqui". Vai por um canal efêmero à parte.
 *
 * Duas mãos, porque servem a coisas opostas:
 * - `local`  — a do próprio Cego. É ela que revela a bomba para ele.
 * - `remote` — a do Cego vista pelos outros. É ela que deixa o Surdo
 *              dizer "mais pra esquerda" em vez de "o triângulo".
 *
 * Store de módulo, não contexto React, por dois motivos práticos: existe
 * no máximo uma cena de partida por vez, e a posição muda 60x por
 * segundo — nada disso pode virar render. De quebra, dispensa
 * atravessar o reconciliador do R3F, que tem árvore própria.
 */
const state = {
  local: null as THREE.Vector3 | null,
  remote: null as THREE.Vector3 | null,
  emit: null as ((point: THREE.Vector3) => void) | null,
};

export function getHandState() {
  return state;
}

export function setRemoteHand(x: number, y: number, z: number): void {
  if (state.remote) state.remote.set(x, y, z);
  else state.remote = new THREE.Vector3(x, y, z);
}

export function setHandEmitter(emit: ((point: THREE.Vector3) => void) | null): void {
  state.emit = emit;
}

export function resetHandState(): void {
  state.local = null;
  state.remote = null;
}

/** ~15 Hz. Suficiente para guiar uma mão; longe de encher a rede. */
const EMIT_INTERVAL_MS = 66;

/**
 * Handlers para pregar na superfície que "sente" a mão (a bandeja da
 * maleta). O ponto vem do próprio raycast do R3F, já em coordenadas de
 * mundo, então funciona igual para mouse e para toque.
 */
export function useHandSurface() {
  const lastEmit = useRef(0);

  return {
    onPointerMove: (event: { point: THREE.Vector3 }) => {
      if (state.local) state.local.copy(event.point);
      else state.local = event.point.clone();

      const now = performance.now();
      if (now - lastEmit.current >= EMIT_INTERVAL_MS) {
        lastEmit.current = now;
        state.emit?.(event.point);
      }
    },
  };
}

/** Liga o emissor de rede à cena enquanto ela estiver montada. */
export function useHandEmitter(emit?: (point: THREE.Vector3) => void): void {
  useEffect(() => {
    resetHandState();
    setHandEmitter(emit ?? null);
    return () => setHandEmitter(null);
  }, [emit]);
}
