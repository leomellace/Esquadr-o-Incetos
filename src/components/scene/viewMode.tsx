"use client";

import { createContext, useContext } from "react";
import { useSceneColors } from "@/lib/design/sceneColors";

/**
 * As três visões (F6) são a MESMA cena com tratamentos diferentes, não
 * três cenas duplicadas. Isso importa por um motivo de jogo, não de
 * engenharia: se o Cego e o Surdo olhassem para geometrias construídas
 * separadamente, elas divergiriam com o tempo, e o jogo inteiro depende
 * de os dois estarem falando exatamente do mesmo objeto.
 *
 * - "sighted": Surdo e Mudo. Cor, luz, visor legível.
 * - "blind":   Cego. Preto chapado com contorno claro — sem cor, sem
 *              texto, sem número. Só silhueta e posição.
 */
export type ViewMode = "sighted" | "blind";

const ViewModeContext = createContext<ViewMode>("sighted");

export const ViewModeProvider = ViewModeContext.Provider;

export function useViewMode(): ViewMode {
  return useContext(ViewModeContext);
}

interface ToyMaterialProps {
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

/**
 * Material padrão das peças. Toda superfície da cena passa por aqui —
 * é o único ponto onde "o Cego não vê cor" vira código.
 *
 * No modo cego a peça fica preta e sem iluminação: o contorno claro
 * passa a carregar a imagem inteira. Não é estilização — é a regra do
 * papel. Ele sabe ONDE as coisas estão e QUE FORMA têm; não sabe de
 * que cor são nem o que está escrito.
 */
export function ToyMaterial({
  color,
  roughness = 0.6,
  metalness = 0,
  emissive,
  emissiveIntensity,
}: ToyMaterialProps) {
  const mode = useViewMode();

  if (mode === "blind") {
    return <meshBasicMaterial color="#04060e" toneMapped={false} />;
  }

  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

/** Cor do contorno: no escuro do Cego, é ele que desenha o mundo. */
export function useOutlineColor(): string {
  const mode = useViewMode();
  const colors = useSceneColors();
  return mode === "blind" ? colors.cream : colors.outline;
}

/**
 * No modo cego o contorno é a imagem, então nunca pode ser cortado por
 * orçamento de performance — e fica mais grosso, porque é a única
 * coisa na tela.
 */
export function useOutlineEnabled(fallback: boolean): boolean {
  return useViewMode() === "blind" ? true : fallback;
}
