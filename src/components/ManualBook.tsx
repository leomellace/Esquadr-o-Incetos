"use client";

import { useState } from "react";
import { ToyButton } from "@/components/ui/ToyButton";
import type { ManualPage } from "@/lib/game/modules/types";

/**
 * O manual do Mudo.
 *
 * Ele é o único que lê estas páginas — e é justamente por isso que elas
 * contêm a REGRA, nunca a resposta. O manual diz "aperte na ordem que
 * o outro ditar"; quem sabe qual é a ordem é quem enxerga a bomba. Se
 * o manual trouxesse a solução, o Mudo resolveria sozinho e o jogo
 * acabaria.
 *
 * O papel é creme sobre a van escura de propósito: é o único objeto da
 * tela dele que parece ter sido impresso, não fabricado.
 */
interface ManualBookProps {
  pages: ManualPage[];
}

export function ManualBook({ pages }: ManualBookProps) {
  const [index, setIndex] = useState(0);

  if (pages.length === 0) return null;

  const page = pages[Math.min(index, pages.length - 1)];

  return (
    <div className="pointer-events-auto w-full max-w-sm">
      <article className="relative rounded-2xl border-2 border-outline bg-cream px-5 py-4 text-outline shadow-[0_6px_0_0_var(--outline)]">
        {/* Furos de encadernação */}
        <span
          aria-hidden
          className="absolute top-4 bottom-4 left-2.5 flex flex-col justify-between"
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="block size-2 rounded-full bg-van/25" />
          ))}
        </span>

        <div className="pl-4">
          <p className="font-mono text-[10px] tracking-[0.25em] text-outline/55 uppercase">
            Manual de desarme · pág. {index + 1}/{pages.length}
          </p>
          <h2 className="mt-1 font-display text-xl leading-tight font-bold">{page.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-outline/85">{page.body}</p>
        </div>
      </article>

      {pages.length > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <ToyButton
            size="sm"
            variant="panel"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            ← Anterior
          </ToyButton>
          <ToyButton
            size="sm"
            variant="panel"
            disabled={index >= pages.length - 1}
            onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          >
            Próxima →
          </ToyButton>
        </div>
      )}
    </div>
  );
}
