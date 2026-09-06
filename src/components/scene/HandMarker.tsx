"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Outlines } from "@react-three/drei";
import { useSceneColors } from "@/lib/design/sceneColors";
import { OUTLINE_PX } from "./outline";
import { getHandState } from "./handTracking";

/**
 * A mão do Cego, desenhada em cena.
 *
 * Aparece duas vezes, com propósitos diferentes:
 * - na tela do próprio Cego, para ele saber onde está tateando;
 * - na tela do Surdo, para ele poder dizer "mais pra esquerda".
 *
 * Esse segundo uso é o que substitui o atalho que a forma dava. Antes,
 * o Surdo dizia "o triângulo" e pronto. Agora ele precisa guiar uma
 * mão que vê se mexendo — que é a conversa que o jogo quer provocar.
 */
export function HandMarker({ source }: { source: "local" | "remote" }) {
  const colors = useSceneColors();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const hand = getHandState();
    const point = source === "local" ? hand.local : hand.remote;
    if (!point) {
      group.visible = false;
      return;
    }

    group.visible = true;
    group.position.copy(point);
  });

  const tint = source === "local" ? colors.cream : colors.play.fio;

  return (
    <group ref={groupRef} visible={false}>
      {/* Dedo apontando para baixo, na direção da peça */}
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.011, 0.02, 0.09, 10]} />
        <meshBasicMaterial color={tint} toneMapped={false} />
        <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />
      </mesh>

      {/* Anel no ponto tocado: marca o alvo sem tapá-lo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[0.032, 0.045, 20]} />
        <meshBasicMaterial color={tint} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
