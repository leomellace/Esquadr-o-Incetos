"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera, AdaptiveDpr, Preload } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useSceneColors } from "@/lib/design/sceneColors";
import { useQualityTier } from "./useQualityTier";
import { ViewModeProvider } from "./viewMode";
import { useHandEmitter } from "./handTracking";
import { HandMarker } from "./HandMarker";
import { Avatar } from "./Avatar";
import { VanInterior } from "./VanInterior";
import { BombCase } from "./BombCase";
import type { Role } from "@/types/database";

/**
 * Cena da bomba (F5).
 *
 * Tom mapeado em Neutral, não ACES: o ACES lava justamente o que essa
 * direção de arte depende — amarelo banana e vermelho alerta saturados.
 * Com Neutral o plástico continua plástico.
 *
 * O bloom é seletivo por construção: `luminanceThreshold` acima de 1
 * só pega o que é emissivo com `toneMapped={false}` (visor, lâmpada,
 * janela, LEDs). Nenhuma superfície difusa entra no brilho.
 */

/** Miolo da maleta: um pouco acima da bandeja, entre os módulos e o visor. */
const LOOK_AT = new THREE.Vector3(0, 0.18, -0.05);

/**
 * Onde cada macaco senta.
 *
 * A geometria não é arbitrária: o visor fica na tampa, que abre para
 * trás, então quem precisa LER o visor tem que estar na frente. Cego e
 * Surdo ficam do lado de cá; o Mudo atravessa para o fundo, e é por
 * isso que ele aparece por cima da bomba no enquadramento dos outros
 * dois — que é exatamente onde o Surdo precisa vê-lo gesticular.
 */
const SEAT_BY_ROLE: Record<Role, [number, number, number]> = {
  cego: [-0.5, -0.24, 1.3],
  surdo: [0.85, -0.24, 1.05],
  // Fora da largura da tampa (a maleta tem 1,25): atrás dela, o Mudo
  // ficaria escondido justo de quem precisa ler os gestos dele.
  mudo: [-1.05, -0.24, -0.85],
};

/** Enquadramento por papel: a câmera fica na altura dos olhos de cada assento. */
const CAMERA_BY_ROLE: Record<Role | "espectador", { position: [number, number, number]; fov: number }> = {
  // Vê a bomba inteira E o Mudo do outro lado da mesa: campo mais largo.
  surdo: { position: [0.55, 0.92, 1.55], fov: 48 },
  // É quem toca: câmera mais baixa e próxima, à distância do braço.
  cego: { position: [0, 0.66, 1.28], fov: 44 },
  // Lê o manual, do outro lado, de frente para os outros dois.
  mudo: { position: [-0.9, 0.86, -1.0], fov: 48 },
  espectador: { position: [0, 0.9, 1.5], fov: 40 },
};

interface BombSceneProps {
  role?: Role | "espectador";
  timeLeftMs: number;
  strikes: number;
  maxStrikes: number;
  simon: { progress: number; sequenceLength: number; solved: boolean };
  interactive: boolean;
  onSimonPress: (buttonIndex: number) => void;
  /** Só o Cego emite; chega aos outros pelo canal de sinais. */
  onHandMove?: (point: THREE.Vector3) => void;
  /** Gesto no ar de cada papel, vindo da rede. */
  gestures?: Partial<Record<Role, { id: string; at: number } | null>>;
}

export function BombScene(props: BombSceneProps) {
  // Medido antes do primeiro render, e imutável depois — ver useQualityTier.
  const high = useQualityTier() === "high";

  return (
    <Canvas
      // "percentage" = PCFShadowMap. O PCFSoft foi depreciado no
      // three 185, e é ele que o <SoftShadows> do drei liga por baixo.
      shadows={props.role === "cego" ? false : "percentage"}
      dpr={[1, high ? 2 : 1.5]}
      gl={{
        antialias: high,
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1.15,
      }}
      style={{ touchAction: "none" }}
    >
      <Suspense fallback={null}>
        <SceneContents {...props} high={high} />
        <Preload all />
      </Suspense>
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}

function SceneContents({
  role = "espectador",
  timeLeftMs,
  strikes,
  maxStrikes,
  simon,
  interactive,
  onSimonPress,
  onHandMove,
  gestures,
  high,
}: BombSceneProps & { high: boolean }) {
  useHandEmitter(onHandMove);
  const colors = useSceneColors();
  const camera = CAMERA_BY_ROLE[role];
  const blind = role === "cego";

  return (
    <ViewModeProvider value={blind ? "blind" : "sighted"}>
      <ResponsiveCamera base={camera} />

      {/* O Cego não está num lugar escuro: ele não está num lugar. O
          fundo é preto puro e a van não é desenhada — o que existe
          para ele é só o objeto que a mão alcança. */}
      <color attach="background" args={[blind ? "#000000" : colors.vanDeep]} />
      {!blind && <fog attach="fog" args={[colors.vanDeep, 3.5, 9]} />}

      {!blind && (
        <>
          {/* Preenchimento frio, só para o breu não engolir a silhueta */}
          <ambientLight intensity={0.55} color="#8fa5d8" />

          {/* A janela: chapada, fria, vindo de trás */}
          <directionalLight
            position={[2.4, 2.2, -3]}
            intensity={1.1}
            color="#bcd9ff"
            castShadow={false}
          />

          {/* Contraluz baixa, para separar a maleta do fundo */}
          <directionalLight position={[-2, 0.6, 2.5]} intensity={0.45} color="#6f86c9" />

          <VanInterior outlined={high} />

          {/* Os outros dois macacos. O próprio jogador não se desenha:
              é a visão dele, não um retrato. */}
          {(["cego", "surdo", "mudo"] as Role[])
            .filter((seat) => seat !== role)
            .map((seat) => (
              <Avatar
                key={seat}
                role={seat}
                position={SEAT_BY_ROLE[seat]}
                gesture={gestures?.[seat] ?? null}
              />
            ))}
        </>
      )}

      <BombCase
        timeLeftMs={timeLeftMs}
        strikes={strikes}
        maxStrikes={maxStrikes}
        simon={simon}
        interactive={interactive}
        onSimonPress={onSimonPress}
      />

      {/* A mão: para o Cego é a própria lanterna; para os outros é o
          que permite dizer "mais pra esquerda". */}
      <HandMarker source={blind ? "local" : "remote"} />

      {/* Sem postprocessing no modo cego: não há nada emissivo para o
          bloom pegar, e a vinheta só comeria o contorno nas bordas. */}
      {high && !blind && (
        <EffectComposer>
          <Bloom
            intensity={0.55}
            luminanceThreshold={1.1}
            luminanceSmoothing={0.2}
            mipmapBlur
            radius={0.6}
          />
          <Vignette offset={0.28} darkness={0.62} eskil={false} />
        </EffectComposer>
      )}
    </ViewModeProvider>
  );
}

/** Proporção para a qual os enquadramentos de CAMERA_BY_ROLE foram pensados. */
const REFERENCE_ASPECT = 1.6;

/**
 * Câmera que se adapta à proporção da tela.
 *
 * O FOV do three é VERTICAL. Num celular em retrato (proporção ~0.46),
 * um FOV vertical de 40° vira um campo horizontal de ~20° — a maleta,
 * que tem 1,25 de largura, não cabe de jeito nenhum. Sem isso o jogador
 * de celular vê um pedaço do centro da bomba e mais nada.
 *
 * A compensação é dividida entre abrir o FOV e afastar a câmera, com
 * teto nos dois: só abrir o ângulo daria olho-de-peixe, e só afastar
 * deixaria a bomba minúscula.
 */
function ResponsiveCamera({ base }: { base: { position: [number, number, number]; fov: number } }) {
  const size = useThree((state) => state.size);
  const ref = useRef<THREE.PerspectiveCamera>(null);

  const { fov, position } = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const shortfall = Math.max(1, REFERENCE_ASPECT / aspect);

    const basePos = new THREE.Vector3(...base.position);
    const framed = LOOK_AT.clone().addScaledVector(
      basePos.sub(LOOK_AT),
      Math.min(shortfall, 1.8),
    );

    return {
      fov: Math.min(62, base.fov * Math.min(shortfall, 1.5)),
      position: framed.toArray() as [number, number, number],
    };
  }, [size.width, size.height, base]);

  useLayoutEffect(() => {
    ref.current?.lookAt(LOOK_AT);
  }, [fov, position]);

  return (
    <PerspectiveCamera ref={ref} makeDefault position={position} fov={fov} near={0.1} far={30} />
  );
}
