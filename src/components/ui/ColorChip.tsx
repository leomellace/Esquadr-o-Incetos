import { PLAY_COLOR_SPECS, type PlayColor } from "@/lib/design/palette";

// A tinta vem de --ink-play, nunca de uma escolha local: a invariante
// da paleta (ver globals.css) é que toda peça aceita tinta escura.
const SWATCH: Record<PlayColor, string> = {
  banana: "bg-banana text-ink-play",
  alerta: "bg-alerta text-ink-play",
  circuito: "bg-circuito text-ink-play",
  cabo: "bg-cabo text-ink-play",
  fio: "bg-fio text-ink-play",
};

interface ColorChipProps {
  color: PlayColor;
  /** Mostra o nome falado sob o glifo. Desligue em grades densas. */
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const CHIP_SIZE = {
  sm: "size-8 text-base rounded-lg",
  md: "size-12 text-xl rounded-xl",
  lg: "size-16 text-3xl rounded-2xl",
} as const;

/**
 * Único jeito autorizado de mostrar uma cor de jogo na interface.
 *
 * Emite sempre os três canais juntos — cor, glifo e nome acessível —
 * para que nenhum deles seja o único caminho até a informação. Ver
 * o comentário de projeto em lib/design/palette.ts.
 */
export function ColorChip({
  color,
  showLabel = false,
  size = "md",
  className = "",
}: ColorChipProps) {
  const spec = PLAY_COLOR_SPECS[color];

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div
        className={[
          "grid place-items-center border-2 border-outline leading-none",
          "shadow-[0_3px_0_0_var(--outline)]",
          SWATCH[color],
          CHIP_SIZE[size],
        ].join(" ")}
      >
        <span aria-hidden>{spec.glyph}</span>
        <span className="sr-only">
          {spec.label} — {spec.spoken}
        </span>
      </div>
      {showLabel && (
        <span className="font-mono text-[11px] tracking-wide text-cream-dim uppercase">
          {spec.spoken}
        </span>
      )}
    </div>
  );
}
