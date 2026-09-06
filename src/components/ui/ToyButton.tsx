"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "banana" | "alerta" | "circuito" | "cabo" | "fio" | "cream" | "panel";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  banana: "bg-banana text-ink-play",
  alerta: "bg-alerta text-ink-play",
  circuito: "bg-circuito text-ink-play",
  cabo: "bg-cabo text-ink-play",
  fio: "bg-fio text-ink-play",
  cream: "bg-cream text-outline",
  panel: "bg-panel-hi text-cream",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-xl",
  md: "px-5 py-2.5 text-base rounded-2xl",
  lg: "px-8 py-4 text-xl rounded-3xl",
};

/** Altura da peça de plástico, em px. Vira sombra dura e curso do clique. */
const DEPTH: Record<Size, number> = { sm: 3, md: 5, lg: 7 };

interface ToyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/**
 * Botão de plástico moldado. A sombra dura é a espessura da peça:
 * ao apertar, o botão desce exatamente a altura da própria sombra,
 * então ele encosta na superfície em vez de "piscar" um estado novo.
 * É esse acoplamento que faz parecer um objeto e não um retângulo.
 */
export function ToyButton({
  variant = "banana",
  size = "md",
  className = "",
  children,
  style,
  ...props
}: ToyButtonProps) {
  const depth = DEPTH[size];

  return (
    <button
      {...props}
      style={
        {
          "--depth": `${depth}px`,
          boxShadow: `0 var(--depth) 0 0 var(--outline)`,
          ...style,
        } as React.CSSProperties
      }
      className={[
        "relative isolate overflow-hidden",
        "border-2 border-outline font-display font-semibold",
        "transition-[transform,box-shadow] duration-[90ms] ease-(--ease-toy)",
        "active:translate-y-(--depth) active:shadow-none",
        "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-cream",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
    >
      {/* Brilho de molde: luz da lâmpada batendo no topo da peça. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
      />
      {children}
    </button>
  );
}
