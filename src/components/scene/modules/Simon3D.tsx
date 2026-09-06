"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Outlines } from "@react-three/drei";
import { useSceneColors } from "@/lib/design/sceneColors";
import { OUTLINE_PX } from "../outline";
import { ToyMaterial, useOutlineColor, useViewMode } from "../viewMode";
import { PLAY_COLOR_SPECS, type PlayColor } from "@/lib/design/palette";

/**
 * Simon em 3D.
 *
 * O glifo da F1 (● ▲ ■ ◆) vira a FORMA da peça — mas só para quem
 * enxerga. É acessibilidade: o canal redundante que deixa um jogador
 * daltônico distinguir os botões sem depender da cor.
 *
 * Para o Cego, todos os quatro são idênticos. Ver `ButtonShape` — a
 * primeira versão vazava a silhueta para ele e matava o jogo.
 */

const BUTTON_ORDER: PlayColor[] = ["banana", "alerta", "circuito", "cabo"];

const GRID: [number, number][] = [
  [-0.09, 0.09],
  [0.09, 0.09],
  [-0.09, -0.09],
  [0.09, -0.09],
];

// A silhueta só comunica se estiver na orientação certa vista de cima:
// o triângulo com a ponta para longe do jogador, o losango como losango
// (e não como um quadrado girado por acaso).
const SHAPE_YAW: Record<PlayColor, number> = {
  banana: 0,
  alerta: Math.PI / 6,
  circuito: 0,
  cabo: Math.PI / 4,
  fio: 0,
};

interface SimonButtonProps {
  color: PlayColor;
  position: [number, number, number];
  disabled: boolean;
  onPress: () => void;
}

function SimonButton({ color, position, disabled, onPress }: SimonButtonProps) {
  const colors = useSceneColors();
  const outline = useOutlineColor();
  const blind = useViewMode() === "blind";
  const capRef = useRef<THREE.Mesh>(null);
  const pressRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  const baseColor = colors.play[color];

  // Mesma física do ToyButton da F1: a peça afunda o próprio curso e
  // volta com overshoot, em vez de "piscar" um estado novo.
  useFrame((_, delta) => {
    pressRef.current = Math.max(0, pressRef.current - delta * 6);
    if (capRef.current) {
      const lift = hovered && !disabled ? 0.008 : 0;
      capRef.current.position.y = 0.035 + lift - pressRef.current * 0.028;
    }
  });

  const tint = useMemo(() => {
    if (!disabled) return baseColor;
    // Desligado: puxa para o painel, mantendo a silhueta legível.
    return new THREE.Color(baseColor).lerp(new THREE.Color(colors.panel), 0.55).getStyle();
  }, [baseColor, disabled, colors.panel]);

  function handleClick(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    if (disabled) return;
    pressRef.current = 1;
    onPress();
  }

  return (
    <group position={position}>
      {/* Soquete: o furo no painel onde a peça encaixa */}
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <cylinderGeometry args={[0.062, 0.062, 0.024, 20]} />
        <ToyMaterial color={colors.vanDeep} roughness={0.9} />
        <Outlines thickness={OUTLINE_PX.detail} color={outline} />
      </mesh>

      {/* A peça: a forma É o glifo */}
      <mesh
        ref={capRef}
        position={[0, 0.035, 0]}
        rotation={[0, blind ? 0 : SHAPE_YAW[color], 0]}
        castShadow
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!disabled) {
            setHovered(true);
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <ButtonShape color={color} blind={blind} />

        {/* O destaque é o ÚNICO retorno visual que o Cego tem: diz
            "sua mão está nesta peça", e nada mais. Não é cor
            codificando informação — é posição. Sem ele, tatear no
            escuro seria adivinhação pura. */}
        {blind ? (
          <meshBasicMaterial
            color={hovered && !disabled ? colors.cream : "#04060e"}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            color={tint}
            roughness={0.32}
            metalness={0}
            emissive={tint}
            emissiveIntensity={hovered && !disabled ? 0.35 : 0.08}
          />
        )}

        <Outlines thickness={OUTLINE_PX.detail} color={outline} />
      </mesh>
    </group>
  );
}

/**
 * Geometria por slot.
 *
 * A forma existe para quem ENXERGA: é o canal redundante que deixa um
 * jogador daltônico distinguir as peças sem depender da cor. Ela nunca
 * chega ao Cego.
 *
 * Isso é deliberado e foi corrigido depois de um erro de projeto: no
 * primeiro corte a silhueta aparecia também para o Cego, e o jogo
 * inteiro desmoronava — bastava o Surdo dizer "o triângulo" e o Cego
 * achava sozinho. Sem forma, ele só tem posição, e o Surdo é obrigado
 * a guiar a mão: "mais à esquerda, agora sobe". É essa frase que o
 * jogo quer produzir.
 */
function ButtonShape({ color, blind }: { color: PlayColor; blind: boolean }) {
  // Todas iguais para o Cego: quatro botões idênticos numa grade.
  if (blind) return <cylinderGeometry args={[0.052, 0.052, 0.034, 16]} />;

  switch (color) {
    case "banana": // ● círculo
      return <cylinderGeometry args={[0.048, 0.048, 0.034, 24]} />;
    case "alerta": // ▲ triângulo
      return <cylinderGeometry args={[0.058, 0.058, 0.034, 3]} />;
    case "circuito": // ■ quadrado
      return <boxGeometry args={[0.082, 0.034, 0.082]} />;
    case "cabo": // ◆ losango (o mesmo cubo, girado)
      return <boxGeometry args={[0.07, 0.034, 0.07]} />;
    default:
      return <cylinderGeometry args={[0.048, 0.048, 0.034, 24]} />;
  }
}

interface Simon3DProps {
  progress: number;
  sequenceLength: number;
  solved: boolean;
  disabled: boolean;
  onPress: (buttonIndex: number) => void;
}

export function Simon3D({ progress, sequenceLength, solved, disabled, onPress }: Simon3DProps) {
  const colors = useSceneColors();
  const outline = useOutlineColor();
  const blind = useViewMode() === "blind";

  return (
    <group>
      {/* Placa do módulo, aparafusada na bandeja */}
      <RoundedBox args={[0.3, 0.03, 0.3]} radius={0.012} smoothness={3} receiveShadow castShadow>
        <ToyMaterial color={colors.panelHi} roughness={0.6} />
        <Outlines thickness={OUTLINE_PX.detail} color={outline} />
      </RoundedBox>

      {/* Parafusos nos cantos — a mesma linguagem do <Panel> da F1 */}
      {!blind &&
        [
          [-0.12, 0.12],
          [0.12, 0.12],
          [-0.12, -0.12],
          [0.12, -0.12],
        ].map(([x, z]) => (
          <mesh key={`${x},${z}`} position={[x, 0.016, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.009, 8]} />
            <ToyMaterial color={colors.vanDeep} roughness={0.5} />
          </mesh>
        ))}

      {/* Progresso da sequência.
          Fica de fora da visão do Cego: são LEDs, não relevo. Ele
          aperta sem saber se acertou — quem vê tem que avisar. É
          desconfortável de propósito; é o jogo. */}
      {!blind && (
        <group position={[0, 0.017, -0.118]}>
          {Array.from({ length: sequenceLength }, (_, i) => {
            const lit = i < progress;
            return (
              <mesh
                key={i}
                position={[(i - (sequenceLength - 1) / 2) * 0.036, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <circleGeometry args={[0.011, 12]} />
                <meshStandardMaterial
                  color={lit ? colors.lcd : colors.vanDeep}
                  emissive={lit ? colors.lcd : "#000000"}
                  emissiveIntensity={lit ? 1.4 : 0}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {BUTTON_ORDER.map((color, index) => (
        <SimonButton
          key={color}
          color={color}
          position={[GRID[index][0], 0.015, -GRID[index][1] + 0.02]}
          disabled={disabled || solved}
          onPress={() => onPress(index)}
        />
      ))}
    </group>
  );
}

/** Nome falado de cada botão, para o Surdo ditar ao Cego (F6 usa isto). */
export const SIMON_BUTTON_LABELS = BUTTON_ORDER.map((c) => PLAY_COLOR_SPECS[c].spoken);
