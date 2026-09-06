"use client";

import { RoundedBox, Outlines } from "@react-three/drei";
import { useSceneColors } from "@/lib/design/sceneColors";
import { OUTLINE_PX } from "./outline";

/**
 * O interior da van. É cenário: existe para dar lugar e clima, não para
 * ser olhado. Por isso a bagunça é composta de silhuetas simples —
 * caixotes, extintor, rádio — que lêem bem no escuro e custam pouco.
 *
 * A luz conta a história: uma lâmpada quente pendurada logo acima da
 * bomba, e uma janela fria estourada atrás. É o contraste entre as duas
 * que dá o volume, e é ele que sobrevive quando o bloom sai no tier
 * baixo.
 */

interface VanInteriorProps {
  outlined?: boolean;
}

export function VanInterior({ outlined = true }: VanInteriorProps) {
  const colors = useSceneColors();

  return (
    <group>
      {/* ---- Casco ---- */}
      {/* Chão */}
      <mesh position={[0, -1.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 6]} />
        <meshStandardMaterial color={colors.vanDeep} roughness={1} />
      </mesh>

      {/* Parede do fundo */}
      <mesh position={[0, 0.3, -2]} receiveShadow>
        <planeGeometry args={[5, 3.2]} />
        <meshStandardMaterial color={colors.van} roughness={1} />
      </mesh>

      {/* Laterais */}
      <mesh position={[-2, 0.3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[6, 3.2]} />
        <meshStandardMaterial color={colors.van} roughness={1} />
      </mesh>
      <mesh position={[2, 0.3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[6, 3.2]} />
        <meshStandardMaterial color={colors.van} roughness={1} />
      </mesh>

      {/* Teto */}
      <mesh position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 6]} />
        <meshStandardMaterial color={colors.vanDeep} roughness={1} />
      </mesh>

      {/* ---- Janela na parede do fundo: luz fria estourada ---- */}
      <group position={[0.95, 0.72, -1.98]}>
        <mesh>
          <planeGeometry args={[0.95, 0.6]} />
          <meshStandardMaterial
            color="#cfe6ff"
            emissive="#a8d4ff"
            emissiveIntensity={1.25}
            toneMapped={false}
          />
        </mesh>
        {/* Moldura */}
        <RoundedBox args={[1.06, 0.71, 0.06]} radius={0.03} smoothness={2} position={[0, 0, -0.03]}>
          <meshStandardMaterial color={colors.panel} roughness={0.8} />
          {outlined && <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />}
        </RoundedBox>
      </group>

      {/* Cortinas ladeando a janela */}
      {[-0.62, 0.62].map((dx) => (
        <RoundedBox
          key={dx}
          args={[0.22, 0.95, 0.07]}
          radius={0.05}
          smoothness={2}
          position={[0.95 + dx, 0.62, -1.9]}
          castShadow
        >
          <meshStandardMaterial color={colors.play.alerta} roughness={0.9} />
          {outlined && <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />}
        </RoundedBox>
      ))}

      {/* ---- Mesa onde a maleta está ---- */}
      <RoundedBox
        args={[1.9, 0.1, 1.25]}
        radius={0.04}
        smoothness={3}
        position={[0, -0.21, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#5a4632" roughness={0.85} />
        {outlined && <Outlines thickness={OUTLINE_PX.chassis} color={colors.outline} />}
      </RoundedBox>
      {[
        [-0.8, -0.45],
        [0.8, -0.45],
        [-0.8, 0.45],
        [0.8, 0.45],
      ].map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, -0.66, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 10]} />
          <meshStandardMaterial color="#4a3928" roughness={0.9} />
        </mesh>
      ))}

      {/* ---- Bagunça ---- */}
      <Props outlined={outlined} />

      {/* ---- Lâmpada ---- */}
      <HangingLamp outlined={outlined} />
    </group>
  );
}

function Props({ outlined }: { outlined: boolean }) {
  const colors = useSceneColors();

  return (
    <group>
      {/* Caixotes empilhados à esquerda */}
      <RoundedBox
        args={[0.55, 0.42, 0.45]}
        radius={0.03}
        smoothness={2}
        position={[-1.55, -0.89, -0.75]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#7a5a35" roughness={0.95} />
        {outlined && <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />}
      </RoundedBox>
      <RoundedBox
        args={[0.44, 0.34, 0.4]}
        radius={0.03}
        smoothness={2}
        position={[-1.5, -0.51, -0.8]}
        rotation={[0, 0.3, 0]}
        castShadow
      >
        <meshStandardMaterial color="#8a6a42" roughness={0.95} />
        {outlined && <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />}
      </RoundedBox>

      {/* Extintor */}
      <group position={[1.62, -0.72, -1.3]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.55, 14]} />
          <meshStandardMaterial color={colors.play.alerta} roughness={0.45} />
          {outlined && <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />}
        </mesh>
        <mesh position={[0, 0.33, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.075, 0.12, 12]} />
          <meshStandardMaterial color="#8d9199" roughness={0.4} metalness={0.5} />
        </mesh>
      </group>

      {/* Rádio numa prateleira */}
      <group position={[-1.45, 0.28, -1.85]}>
        <RoundedBox args={[0.5, 0.05, 0.28]} radius={0.02} smoothness={2} position={[0, -0.14, 0]}>
          <meshStandardMaterial color="#5a4632" roughness={0.9} />
          {outlined && <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />}
        </RoundedBox>
        <RoundedBox args={[0.38, 0.22, 0.16]} radius={0.03} smoothness={2} castShadow>
          <meshStandardMaterial color={colors.play.cabo} roughness={0.5} />
          {outlined && <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />}
        </RoundedBox>
        {/* Antena */}
        <mesh position={[0.15, 0.24, 0]} rotation={[0, 0, -0.35]}>
          <cylinderGeometry args={[0.006, 0.006, 0.32, 6]} />
          <meshStandardMaterial color="#8d9199" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Placa de perigo na parede */}
      <group position={[-1.2, 0.85, -1.97]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.03, 3]} />
          <meshStandardMaterial color={colors.play.banana} roughness={0.7} />
          {outlined && <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />}
        </mesh>
      </group>

      {/* Cacho de bananas sobre a mesa */}
      <group position={[0.72, -0.12, 0.42]} rotation={[0, -0.4, 0]}>
        {[-0.05, 0, 0.05].map((dx, i) => (
          <mesh
            key={dx}
            position={[dx, 0.02 * i, 0]}
            rotation={[0, 0, 0.4 + i * 0.15]}
            scale={[1, 0.42, 0.42]}
            castShadow
          >
            <capsuleGeometry args={[0.038, 0.16, 4, 8]} />
            <meshStandardMaterial color={colors.play.banana} roughness={0.6} />
            {outlined && <Outlines thickness={OUTLINE_PX.detail} color={colors.outline} />}
          </mesh>
        ))}
      </group>
    </group>
  );
}

function HangingLamp({ outlined }: { outlined: boolean }) {
  const colors = useSceneColors();

  return (
    <group position={[0, 1.0, -0.1]}>
      {/* Fio */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.64, 6]} />
        <meshStandardMaterial color={colors.outline} roughness={1} />
      </mesh>

      {/* Cúpula */}
      <mesh castShadow>
        <coneGeometry args={[0.3, 0.26, 20, 1, true]} />
        <meshStandardMaterial color={colors.play.alerta} roughness={0.5} side={2} />
        {outlined && <Outlines thickness={OUTLINE_PX.part} color={colors.outline} />}
      </mesh>

      {/* Lâmpada */}
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.075, 16, 12]} />
        <meshStandardMaterial
          color={colors.lamp}
          emissive={colors.lamp}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>

      {/* A luz quente principal da cena */}
      <pointLight
        position={[0, -0.12, 0]}
        color={colors.lamp}
        intensity={16}
        distance={8}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0008}
      />
    </group>
  );
}
