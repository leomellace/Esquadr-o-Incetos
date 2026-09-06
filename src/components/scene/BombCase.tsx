"use client";

import { RoundedBox, Outlines } from "@react-three/drei";
import { useSceneColors } from "@/lib/design/sceneColors";
import { OUTLINE_PX } from "./outline";
import { ToyMaterial, useOutlineColor, useViewMode } from "./viewMode";
import { LcdDisplay3D } from "./LcdDisplay3D";
import { Simon3D } from "./modules/Simon3D";

/**
 * A maleta. Tudo aqui é geometria procedural — caixa arredondada,
 * cilindro, cone — porque não há pipeline de assets nem artista: o
 * "plástico injetado" da F1 se traduz bem em primitivas grossas com
 * contorno preto, que é justamente o que o estilo pede.
 *
 * A tampa abre ~100°, passando da vertical, para a face interna (onde
 * mora o visor) ficar virada para o jogador — mesma geometria de uma
 * tela de notebook.
 *
 * As quatro baias existem desde já, mesmo com um módulo só: é onde a
 * F9 encaixa os outros cinco sem mexer no chassi.
 */

const LID_OPEN_RAD = -1.75; // ~100°, um pouco além da vertical

interface BombCaseProps {
  timeLeftMs: number;
  strikes: number;
  maxStrikes: number;
  simon: {
    progress: number;
    sequenceLength: number;
    solved: boolean;
  };
  interactive: boolean;
  onSimonPress: (buttonIndex: number) => void;
}

export function BombCase({
  timeLeftMs,
  strikes,
  maxStrikes,
  simon,
  interactive,
  onSimonPress,
}: BombCaseProps) {
  const colors = useSceneColors();
  const outline = useOutlineColor();
  const blind = useViewMode() === "blind";
  const shellColor = "#39404f";

  return (
    <group>
      {/* ---- Casco inferior ---- */}
      <RoundedBox
        args={[1.25, 0.16, 0.85]}
        radius={0.045}
        smoothness={3}
        position={[0, -0.08, 0]}
        castShadow
        receiveShadow
      >
        <ToyMaterial color={shellColor} roughness={0.65} />
        <Outlines thickness={OUTLINE_PX.chassis} color={outline} />
      </RoundedBox>

      {/* Bandeja interna, verde de feltro */}
      <RoundedBox
        args={[1.13, 0.04, 0.73]}
        radius={0.015}
        smoothness={3}
        position={[0, 0.005, 0]}
        receiveShadow
      >
        <ToyMaterial color="#1f6b3a" roughness={0.95} />
        {blind && <Outlines thickness={OUTLINE_PX.detail} color={outline} />}
      </RoundedBox>

      {/* Cantoneiras de borracha */}
      {[
        [-0.58, -0.39],
        [0.58, -0.39],
        [-0.58, 0.39],
        [0.58, 0.39],
      ].map(([x, z]) => (
        <RoundedBox
          key={`${x},${z}`}
          args={[0.13, 0.13, 0.13]}
          radius={0.03}
          smoothness={3}
          position={[x, -0.08, z]}
          castShadow
        >
          <ToyMaterial color={colors.play.banana} roughness={0.5} />
          <Outlines thickness={OUTLINE_PX.part} color={outline} />
        </RoundedBox>
      ))}

      {/* Travas na frente */}
      {[-0.28, 0.28].map((x) => (
        <RoundedBox
          key={x}
          args={[0.14, 0.07, 0.05]}
          radius={0.018}
          smoothness={3}
          position={[x, -0.03, 0.42]}
          castShadow
        >
          <ToyMaterial color={colors.play.banana} roughness={0.4} metalness={0.1} />
          <Outlines thickness={OUTLINE_PX.detail} color={outline} />
        </RoundedBox>
      ))}

      {/* Dobradiças */}
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.01, -0.42]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.16, 12]} />
          <ToyMaterial color="#8d9199" roughness={0.35} metalness={0.6} />
        </mesh>
      ))}

      {/* ---- Módulos na bandeja ---- */}
      <group position={[-0.29, 0.04, 0.185]}>
        <Simon3D
          progress={simon.progress}
          sequenceLength={simon.sequenceLength}
          solved={simon.solved}
          disabled={!interactive}
          onPress={onSimonPress}
        />
      </group>

      <group position={[0.29, 0.04, 0.185]}>
        <BlankBay variant="vents" />
      </group>
      <group position={[-0.29, 0.04, -0.185]}>
        <BlankBay variant="label" />
      </group>
      <group position={[0.29, 0.04, -0.185]}>
        <BlankBay variant="plate" />
      </group>

      {/* ---- Tampa ---- */}
      <group position={[0, 0, -0.42]} rotation={[LID_OPEN_RAD, 0, 0]}>
        <RoundedBox
          args={[1.25, 0.1, 0.85]}
          radius={0.04}
          smoothness={3}
          position={[0, 0.05, 0.42]}
          castShadow
        >
          <ToyMaterial color={shellColor} roughness={0.65} />
          <Outlines thickness={OUTLINE_PX.chassis} color={outline} />
        </RoundedBox>

        {/* Face interna da tampa: forro claro */}
        <mesh position={[0, -0.002, 0.42]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.13, 0.73]} />
          <ToyMaterial color={colors.panel} roughness={0.9} />
        </mesh>

        {/* Visor, virado para o jogador com a tampa aberta */}
        <group position={[0, -0.03, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
          <LcdDisplay3D ms={timeLeftMs} strikes={strikes} maxStrikes={maxStrikes} />
        </group>
      </group>
    </group>
  );
}

/** Baia vazia — existe para o chassi parecer um objeto completo antes da F9. */
function BlankBay({ variant }: { variant: "vents" | "label" | "plate" }) {
  const colors = useSceneColors();
  const outline = useOutlineColor();
  const blind = useViewMode() === "blind";

  return (
    <group>
      <RoundedBox args={[0.3, 0.03, 0.3]} radius={0.012} smoothness={3} receiveShadow castShadow>
        <ToyMaterial color={colors.panel} roughness={0.75} />
        <Outlines thickness={OUTLINE_PX.detail} color={outline} />
      </RoundedBox>

      {/* Detalhes chapados somem para o Cego: são marcas impressas na
          superfície, sem relevo. Ele não teria como percebê-las — e
          desenhá-las em contorno inventaria informação que ele não tem. */}
      {!blind &&
        variant === "vents" &&
        [-0.08, -0.027, 0.027, 0.08].map((z) => (
          <mesh key={z} position={[0, 0.017, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.22, 0.022]} />
            <ToyMaterial color={colors.vanDeep} roughness={1} />
          </mesh>
        ))}

      {!blind && variant === "label" && (
        <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 0.12]} />
          <ToyMaterial color={colors.play.banana} roughness={0.8} />
        </mesh>
      )}

      {/* O disco tem relevo, então o Cego o percebe — e ganha contorno. */}
      {variant === "plate" && (
        <mesh position={[0, 0.023, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.016, 16]} />
          <ToyMaterial color={colors.panelHi} roughness={0.5} metalness={0.2} />
          {blind && <Outlines thickness={OUTLINE_PX.detail} color={outline} />}
        </mesh>
      )}

      {!blind &&
        [
          [-0.12, 0.12],
          [0.12, 0.12],
          [-0.12, -0.12],
          [0.12, -0.12],
        ].map(([x, z]) => (
          <mesh key={`${x},${z}`} position={[x, 0.017, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.009, 8]} />
            <ToyMaterial color={colors.vanDeep} roughness={0.5} />
          </mesh>
        ))}
    </group>
  );
}
