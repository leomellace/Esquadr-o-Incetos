import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  title?: string;
  /** Parafusos nos cantos. Ligue em painéis que representam hardware. */
  screws?: boolean;
  className?: string;
}

function Screw({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute size-2.5 rounded-full border border-outline bg-panel-hi ${className}`}
    >
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-outline/70" />
    </span>
  );
}

/** Painel de plástico parafusado. O contêiner base de toda a UI. */
export function Panel({ children, title, screws = false, className = "" }: PanelProps) {
  return (
    <section
      className={[
        "relative rounded-2xl border-2 border-outline bg-panel p-5",
        "shadow-[0_5px_0_0_var(--outline)]",
        className,
      ].join(" ")}
    >
      {/* Aresta superior pegando a luz da lâmpada. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-white/25"
      />

      {screws && (
        <>
          <Screw className="top-2 left-2" />
          <Screw className="top-2 right-2" />
          <Screw className="bottom-2 left-2" />
          <Screw className="bottom-2 right-2" />
        </>
      )}

      {title && (
        <h2 className="mb-3 font-display text-sm tracking-[0.18em] text-cream-dim uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
