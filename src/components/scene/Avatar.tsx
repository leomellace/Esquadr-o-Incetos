"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Outlines } from "@react-three/drei";
import { useSceneColors } from "@/lib/design/sceneColors";
import { OUTLINE_PX } from "./outline";
import { gestureIcon } from "@/lib/game/gestures";
import type { Role } from "@/types/database";

/**
 * Os macacos.
 *
 * Existem por um motivo funcional, não decorativo: o Mudo não pode
 * falar, então a única saída dele é gesticular — e gesticular só serve
 * se alguém estiver olhando. Sem avatar, a corrente
 * Mudo → Surdo → Cego não fecha.
 *
 * A marca de papel fica no corpo, não num rótulo: venda vermelha nos
 * olhos do Cego, X na boca do Mudo, fone nas orelhas do Surdo. Dá para
 * saber quem é quem de relance, de qualquer ângulo, sem ler nada — e
 * lembra a cada segundo o que aquele jogador NÃO pode fazer.
 */

const FUR = "#a8703f";
const FUR_DARK = "#8a5a31";
const MUZZLE = "#e0b183";

interface AvatarProps {
  role: Role;
  position: [number, number, number];
  /** Para onde o macaco olha — normalmente a bomba. */
  lookAt?: [number, number, number];
  gesture?: { id: string; at: number } | null;
}

export function Avatar({ role, position, lookAt = [0, 0.1, 0], gesture }: AvatarProps) {
  const colors = useSceneColors();
  const groupRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (group) {
      group.lookAt(lookAt[0], position[1], lookAt[2]);
    }

    // O braço sobe enquanto há gesto no ar: é o que faz o Surdo
    // perceber que o Mudo está falando com ele, mesmo de canto de olho.
    const arm = armRef.current;
    if (arm) {
      const active = gesture ? 1 : 0;
      const wave = active ? Math.sin(clock.elapsedTime * 9) * 0.22 : 0;
      arm.rotation.z = THREE.MathUtils.lerp(arm.rotation.z, -0.35 - active * 1.5 + wave, 0.18);
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Corpo */}
        <mesh position={[0, 0.16, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.16, 6, 14]} />
          <meshStandardMaterial color={FUR} roughness={0.85} />
          <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />
        </mesh>

        {/* Barriga clara */}
        <mesh position={[0, 0.15, 0.11]} castShadow>
          <sphereGeometry args={[0.095, 14, 12]} />
          <meshStandardMaterial color={MUZZLE} roughness={0.85} />
        </mesh>

        {/* Braço que gesticula */}
        <group ref={armRef} position={[-0.16, 0.24, 0.02]}>
          <mesh position={[-0.02, -0.09, 0]} castShadow>
            <capsuleGeometry args={[0.042, 0.14, 4, 10]} />
            <meshStandardMaterial color={FUR_DARK} roughness={0.85} />
            <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />
          </mesh>
          <mesh position={[-0.03, -0.19, 0]} castShadow>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color={colors.cream} roughness={0.7} />
            <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />
          </mesh>
        </group>

        {/* Braço parado */}
        <mesh position={[0.17, 0.14, 0.02]} rotation={[0, 0, 0.4]} castShadow>
          <capsuleGeometry args={[0.042, 0.14, 4, 10]} />
          <meshStandardMaterial color={FUR_DARK} roughness={0.85} />
          <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />
        </mesh>

        {/* Cabeça */}
        <group position={[0, 0.42, 0]}>
          <mesh castShadow scale={[1, 0.94, 0.9]}>
            <sphereGeometry args={[0.155, 18, 16]} />
            <meshStandardMaterial color={FUR} roughness={0.85} />
            <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />
          </mesh>

          {/* Focinho */}
          <mesh position={[0, -0.035, 0.115]} scale={[1.15, 0.85, 0.8]} castShadow>
            <sphereGeometry args={[0.082, 14, 12]} />
            <meshStandardMaterial color={MUZZLE} roughness={0.8} />
          </mesh>

          {/* Olhos */}
          {[-0.055, 0.055].map((x) => (
            <mesh key={x} position={[x, 0.035, 0.132]} scale={[0.75, 1, 0.6]}>
              <sphereGeometry args={[0.03, 12, 10]} />
              <meshStandardMaterial color={colors.outline} roughness={0.4} />
            </mesh>
          ))}

          {/* Orelhas */}
          {[-0.15, 0.15].map((x) => (
            <mesh key={x} position={[x, 0.01, 0]} scale={[0.5, 1, 1]} castShadow>
              <sphereGeometry args={[0.062, 12, 10]} />
              <meshStandardMaterial color={MUZZLE} roughness={0.85} />
              <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />
            </mesh>
          ))}

          {/* Topete */}
          <mesh position={[0, 0.14, -0.01]} scale={[1, 0.8, 1]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color={FUR_DARK} roughness={0.9} />
          </mesh>

          <RoleMark role={role} />
        </group>

        {gesture && <GestureBubble id={gesture.id} />}
      </group>
    </group>
  );
}

/** O que cada macaco não pode fazer, vestido no corpo. */
function RoleMark({ role }: { role: Role }) {
  const colors = useSceneColors();
  const red = colors.play.alerta;

  if (role === "cego") {
    // Venda sobre os olhos
    return (
      <mesh position={[0, 0.035, 0.048]} scale={[1, 1, 1]}>
        <boxGeometry args={[0.29, 0.062, 0.2]} />
        <meshStandardMaterial color={red} roughness={0.7} />
        <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />
      </mesh>
    );
  }

  if (role === "mudo") {
    // X de fita sobre a boca
    return (
      <group position={[0, -0.055, 0.185]}>
        {[Math.PI / 4, -Math.PI / 4].map((rot) => (
          <mesh key={rot} rotation={[0, 0, rot]}>
            <boxGeometry args={[0.12, 0.028, 0.012]} />
            <meshStandardMaterial color={red} roughness={0.7} />
            <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />
          </mesh>
        ))}
      </group>
    );
  }

  // Surdo: fones cobrindo as orelhas
  return (
    <group>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.05, 14]} />
          <meshStandardMaterial color={red} roughness={0.5} />
          <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />
        </mesh>
      ))}
      {/* Arco por cima */}
      <mesh position={[0, 0.115, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.155, 0.019, 8, 18, Math.PI]} />
        <meshStandardMaterial color={red} roughness={0.5} />
      </mesh>
    </group>
  );
}

/**
 * O gesto no ar. Textura desenhada em canvas em vez de fonte carregada:
 * emoji nativo do sistema, sem rede, sem risco de o gesto sumir porque
 * um arquivo de fonte não chegou.
 */
function GestureBubble({ id }: { id: string }) {
  const colors = useSceneColors();
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.font = "88px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(gestureIcon(id), size / 2, size / 2 + 4);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [id]);

  if (!texture) return null;

  return (
    <group position={[0, 0.72, 0.02]}>
      {/* Balão */}
      <mesh>
        <circleGeometry args={[0.14, 24]} />
        <meshBasicMaterial color={colors.cream} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.13, -0.001]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.07, 0.07]} />
        <meshBasicMaterial color={colors.cream} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[0.19, 0.19]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
