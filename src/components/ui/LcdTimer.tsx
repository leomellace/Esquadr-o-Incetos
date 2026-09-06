interface LcdTimerProps {
  /** Tempo restante em milissegundos. */
  ms: number;
  strikes?: number;
  maxStrikes?: number;
  className?: string;
}

function format(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * O visor da bomba. LCD verde ácido com dígitos pretos — a única
 * fonte de tempo do jogo, e uma das poucas coisas que o Surdo vê e
 * o Cego não.
 *
 * Os "88:88" apagados atrás dos dígitos reais são o detalhe que faz
 * um LCD parecer um LCD: os segmentos existem mesmo desligados.
 */
export function LcdTimer({
  ms,
  strikes = 0,
  maxStrikes = 3,
  className = "",
}: LcdTimerProps) {
  const urgent = ms <= 30_000;

  return (
    <div
      className={[
        "relative inline-flex flex-col items-center gap-1",
        "rounded-xl border-2 border-outline bg-lcd px-5 py-3",
        "shadow-[0_4px_0_0_var(--outline),inset_0_2px_6px_0_rgba(0,0,0,0.35)]",
        className,
      ].join(" ")}
      role="timer"
      aria-label={`Tempo restante ${format(ms)}`}
    >
      <div className="relative font-mono text-5xl leading-none font-bold tabular-nums">
        <span aria-hidden className="absolute inset-0 text-lcd-dim/45 select-none">
          88:88
        </span>
        <span
          className={`relative text-lcd-ink ${urgent ? "animate-pulse" : ""}`}
        >
          {format(ms)}
        </span>
      </div>

      <div className="flex gap-1.5" aria-label={`${strikes} de ${maxStrikes} erros`}>
        {Array.from({ length: maxStrikes }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={[
              "size-2.5 rounded-full border border-lcd-ink/60",
              i < strikes ? "bg-lcd-ink" : "bg-lcd-dim/30",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Reflexo de vidro do visor. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/25 via-transparent to-transparent"
      />
    </div>
  );
}
