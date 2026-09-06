import Link from "next/link";
import { ToyButton } from "@/components/ui/ToyButton";
import { RoleCard } from "@/components/ui/RoleCard";
import type { Role } from "@/types/database";

const ROLES: Role[] = ["cego", "mudo", "surdo"];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Lâmpada pendurada: a única fonte de luz da van. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-lamp/15 blur-3xl"
      />

      <div className="relative flex flex-col items-center text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-cream-dim uppercase">
          Cooperativo · exatamente 3 jogadores
        </p>
        <h1 className="mt-2 font-display text-6xl font-bold tracking-tight text-cream sm:text-7xl">
          Esquadrão InCetos
        </h1>
        <p className="mt-4 max-w-lg text-balance text-cream-dim">
          Um vê. Um lê. Um toca. Nenhum consegue os três. Descubram como se
          comunicar antes que o timer chegue em zero.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ToyButton size="lg" variant="banana" disabled>
            Criar sala
          </ToyButton>
          <ToyButton size="lg" variant="panel" disabled>
            Entrar com código
          </ToyButton>
        </div>
        <p className="mt-3 font-mono text-xs text-cream-dim">
          lobby chega na F2 ·{" "}
          <Link href="/design" className="underline hover:text-cream">
            ver design system
          </Link>
        </p>

        <div className="mt-14 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {ROLES.map((role) => (
            <RoleCard key={role} role={role} />
          ))}
        </div>
      </div>
    </main>
  );
}
