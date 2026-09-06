"use client";

import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getHandState } from "./handTracking";
import { useViewMode } from "./viewMode";

/**
 * No escuro do Cego, só existe o que a mão alcança.
 *
 * O chassi da maleta continua sempre visível — ele precisa de alguma
 * âncora espacial, senão não é jogo, é adivinhação. Mas o CONTEÚDO
 * (peças, placas, o corpo do visor) só aparece quando a mão passa por
 * cima. É por isso que ele não consegue "olhar a bomba inteira e
 * comparar": ele percebe um pedaço de cada vez, e tem que guardar de
 * cabeça.
 *
 * A visibilidade é alternada direto no objeto three, dentro do
 * useFrame — nunca via state. Mexer o mouse não pode disparar render
 * do React 60 vezes por segundo.
 */
const REVEAL_RADIUS = 0.24;

const worldPos = new THREE.Vector3();

export function RevealNearHand({
  children,
  radius = REVEAL_RADIUS,
}: {
  children: ReactNode;
  radius?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const blind = useViewMode() === "blind";

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    if (!blind) {
      group.visible = true;
      return;
    }

    const handPos = getHandState().local;
    if (!handPos) {
      group.visible = false;
      return;
    }

    group.getWorldPosition(worldPos);
    group.visible = worldPos.distanceTo(handPos) < radius;
  });

  return <group ref={groupRef}>{children}</group>;
}
