import type { Role } from "@/types/database";

interface RoleSpec {
  emoji: string;
  name: string;
  /** O que este papel PODE fazer que os outros não podem. */
  can: string;
  /** O canal que este papel não recebe. */
  cannot: string;
  accent: string;
}

export const ROLE_SPECS: Record<Role, RoleSpec> = {
  cego: {
    emoji: "🙈",
    name: "Cego",
    can: "Único que pode tocar a bomba",
    cannot: "Não vê cor nem lê a tela",
    accent: "bg-fio",
  },
  mudo: {
    emoji: "🙊",
    name: "Mudo",
    can: "Único que lê o manual",
    cannot: "Não pode falar",
    accent: "bg-banana",
  },
  surdo: {
    emoji: "🙉",
    name: "Surdo",
    can: "Único que vê a bomba inteira",
    cannot: "Não ouve nada",
    accent: "bg-circuito",
  },
};

interface RoleCardProps {
  role: Role;
  selected?: boolean;
  takenBy?: string | null;
  onSelect?: () => void;
  className?: string;
}

/**
 * Cartão de papel do lobby. Mostra habilidade e limitação lado a lado
 * de propósito: o que faz o jogo funcionar não é o poder de cada um,
 * é o buraco que cada um tem e só outro jogador consegue tapar.
 */
export function RoleCard({
  role,
  selected = false,
  takenBy = null,
  onSelect,
  className = "",
}: RoleCardProps) {
  const spec = ROLE_SPECS[role];
  const locked = Boolean(takenBy) && !selected;
  const Wrapper = onSelect ? "button" : "div";

  return (
    <Wrapper
      onClick={locked ? undefined : onSelect}
      disabled={onSelect ? locked : undefined}
      aria-pressed={onSelect ? selected : undefined}
      className={[
        "group relative flex w-full flex-col items-center gap-2 overflow-hidden",
        "rounded-2xl border-2 border-outline bg-panel p-5 text-center",
        "transition-transform duration-150 ease-(--ease-toy)",
        onSelect && !locked ? "hover:-translate-y-1 cursor-pointer" : "",
        selected
          ? "shadow-[0_0_0_4px_var(--cream),0_5px_0_0_var(--outline)]"
          : "shadow-[0_5px_0_0_var(--outline)]",
        locked ? "opacity-45 grayscale" : "",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1.5 ${spec.accent}`}
      />
      <span aria-hidden className="text-5xl leading-none">
        {spec.emoji}
      </span>
      <h3 className="font-display text-2xl font-bold">{spec.name}</h3>

      <p className="text-sm text-cream">{spec.can}</p>
      <p className="text-sm text-alerta">{spec.cannot}</p>

      {takenBy && (
        <span className="mt-1 font-mono text-xs text-cream-dim">
          {selected ? "você" : takenBy}
        </span>
      )}
    </Wrapper>
  );
}
