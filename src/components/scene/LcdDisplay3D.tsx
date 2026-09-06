"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox, Outlines } from "@react-three/drei";
import { useSceneColors } from "@/lib/design/sceneColors";
import { OUTLINE_PX } from "./outline";
import { ToyMaterial, useOutlineColor, useViewMode } from "./viewMode";

/**
 * Visor de 7 segmentos de verdade — cada traço é geometria, não textura
 * nem fonte. Além de dispensar carregar fonte (e o risco de ela falhar
 * offline), é o que dá o serrilhado certo: um LCD não desenha curvas.
 *
 * Continua a mesma decisão da F1: fundo verde ácido e dígitos PRETOS,
 * com os segmentos apagados visíveis por trás. São eles que fazem um
 * LCD parecer um LCD — os segmentos existem mesmo desligados.
 */

// Segmentos de um dígito, no padrão a-g:
//    aaa
//   f   b
//    ggg
//   e   c
//    ddd
const DIGIT_SEGMENTS: Record<string, string[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "c", "d"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

const W = 0.072; // largura do dígito
const H = 0.135; // altura do dígito
const T = 0.017; // espessura do traço

const SEGMENT_LAYOUT: Record<string, { pos: [number, number]; size: [number, number] }> = {
  a: { pos: [0, H / 2], size: [W - T, T] },
  g: { pos: [0, 0], size: [W - T, T] },
  d: { pos: [0, -H / 2], size: [W - T, T] },
  f: { pos: [-W / 2, H / 4], size: [T, H / 2 - T] },
  b: { pos: [W / 2, H / 4], size: [T, H / 2 - T] },
  e: { pos: [-W / 2, -H / 4], size: [T, H / 2 - T] },
  c: { pos: [W / 2, -H / 4], size: [T, H / 2 - T] },
};

const ALL_SEGMENTS = Object.keys(SEGMENT_LAYOUT);

function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const mm = String(Math.min(99, Math.floor(totalSeconds / 60))).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return mm + ss;
}

interface LcdDisplay3DProps {
  ms: number;
  strikes: number;
  maxStrikes: number;
}

export function LcdDisplay3D({ ms, strikes, maxStrikes }: LcdDisplay3DProps) {
  const colors = useSceneColors();
  const outline = useOutlineColor();
  const blind = useViewMode() === "blind";
  const digits = formatClock(ms);

  // Segmento apagado: o verde do fundo puxado para o verde escuro. É o
  // "fantasma" — nunca preto, senão vira dígito ligado.
  const ghost = useMemo(
    () => new THREE.Color(colors.lcd).lerp(new THREE.Color(colors.lcdDim), 0.32).getStyle(),
    [colors.lcd, colors.lcdDim],
  );

  // Quads simples em vez de instancing: são 30 planos minúsculos que
  // cabem folgados no orçamento, e o instancing do drei recusou-se a
  // desenhá-los aqui. Correção legível vale mais que 29 draw calls.
  const segments = useMemo(() => {
    const out: {
      key: string;
      position: [number, number, number];
      size: [number, number];
      lit: boolean;
    }[] = [];

    const digitGap = W + 0.03;
    const colonGap = 0.05;
    const totalWidth = digitGap * 4 + colonGap;
    const startX = -totalWidth / 2 + W / 2;

    digits.split("").forEach((digit, index) => {
      const x = startX + index * digitGap + (index >= 2 ? colonGap : 0);
      const on = new Set(DIGIT_SEGMENTS[digit] ?? []);

      for (const seg of ALL_SEGMENTS) {
        const { pos, size } = SEGMENT_LAYOUT[seg];
        out.push({
          key: `${index}-${seg}`,
          position: [x + pos[0], pos[1], 0],
          size,
          lit: on.has(seg),
        });
      }
    });

    // Dois pontos, entre os pares.
    const colonX = startX + digitGap * 1.5 + colonGap / 2 + W / 2;
    for (const y of [H / 4, -H / 4]) {
      out.push({ key: `colon-${y}`, position: [colonX, y, 0], size: [T, T], lit: true });
    }

    return out;
  }, [digits]);

  // O Cego percebe a carcaça (tem relevo, dá para tatear) mas não a
  // tela nem os dígitos. Nada de "mostrar o timer apagado": o tempo
  // restante simplesmente não é informação que ele possui — quem tem
  // que dizer é o Surdo, e é isso que força a conversa.
  if (blind) {
    return (
      <RoundedBox args={[0.58, 0.3, 0.05]} radius={0.022} smoothness={3}>
        <ToyMaterial color={colors.panel} roughness={0.7} />
        <Outlines thickness={OUTLINE_PX.detail} color={outline} />
      </RoundedBox>
    );
  }

  return (
    <group>
      {/* Carcaça do visor */}
      <RoundedBox args={[0.58, 0.3, 0.05]} radius={0.022} smoothness={3} castShadow>
        <ToyMaterial color={colors.panel} roughness={0.7} />
        <Outlines thickness={OUTLINE_PX.detail} color={outline} />
      </RoundedBox>

      {/* Tela.
          Material BÁSICO, não standard: um LCD é autoiluminado, e
          deixá-lo receber a luz quente da lâmpada empurrava o verde
          para amarelo e estourava justamente onde os dígitos precisam
          de contraste. Com basic + toneMapped={false}, o verde sai
          exatamente o que o design system define — e o único brilho da
          cena continua sendo lâmpada e janela. */}
      <mesh position={[0, 0.022, 0.026]}>
        <planeGeometry args={[0.5, 0.22]} />
        <meshBasicMaterial color={colors.lcd} toneMapped={false} />
      </mesh>

      {/* Dígitos */}
      <group position={[0, 0.045, 0.028]}>
        {segments.map((seg) => (
          <mesh key={seg.key} position={seg.position}>
            <planeGeometry args={seg.size} />
            <meshBasicMaterial color={seg.lit ? colors.lcdInk : ghost} toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* Marcadores de erro, na mesma tela */}
      <group position={[0, -0.052, 0.028]}>
        {Array.from({ length: maxStrikes }, (_, i) => (
          <mesh key={i} position={[(i - (maxStrikes - 1) / 2) * 0.045, 0, 0]}>
            <circleGeometry args={[0.012, 12]} />
            <meshBasicMaterial color={i < strikes ? colors.lcdInk : ghost} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
