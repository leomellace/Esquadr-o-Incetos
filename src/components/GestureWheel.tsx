"use client";

import { useEffect, useState } from "react";
import { GESTURES, SLAP, gestureIcon, gestureLabel, type GestureId } from "@/lib/game/gestures";
import { ToyButton } from "@/components/ui/ToyButton";

/**
 * A roda de gestos.
 *
 * Radial, e não uma lista, por um motivo prático: quem usa isto está
 * com pressa e não pode falar. Cada gesto fica sempre no mesmo ângulo,
 * então depois de duas partidas a mão vai sozinha — a posição vira o
 * atalho, do jeito que a fala seria.
 *
 * Os números 1–4 são atalhos de teclado direto, sem abrir a roda: são
 * os mais usados numa sequência e é onde a demora custa mais caro.
 */
interface GestureWheelProps {
  onGesture: (id: GestureId | typeof SLAP.id) => void;
  /**
   * O gesto que o próprio jogador tem no ar agora.
   *
   * Ele não se vê: a cena desenha os outros dois macacos, não o dono da
   * câmera. Sem esta confirmação, gesticular é gritar no vácuo — e o
   * jogador manda o mesmo gesto três vezes por não saber se saiu.
   */
  active?: { id: string } | null;
  /** O Mudo é quem mais precisa, mas todos podem gesticular. */
  disabled?: boolean;
}

export function GestureWheel({ onGesture, active = null, disabled = false }: GestureWheelProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) return;

    function onKey(event: KeyboardEvent) {
      if (event.repeat) return;
      // Um campo de texto em foco fica com as teclas: senão digitar
      // "3" no nome mandaria um gesto para a sala inteira.
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "")) {
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      // 1–4 disparam direto: são o que mais se repete.
      const numeric = ["um", "dois", "tres", "quatro"] as const;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < numeric.length) {
        onGesture(numeric[index]);
        setOpen(false);
        return;
      }
      if (event.key.toLowerCase() === "g") setOpen((v) => !v);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onGesture, disabled]);

  if (disabled) return null;

  return (
    <div className="pointer-events-auto flex items-end gap-2">
      {active && (
        <span className="mb-1 flex items-center gap-1.5 rounded-full border-2 border-outline bg-cream px-2.5 py-1 text-lg shadow-[0_2px_0_0_var(--outline)]">
          <span aria-hidden>{gestureIcon(active.id)}</span>
          <span className="font-mono text-[10px] tracking-wide text-outline/70 uppercase">
            no ar
          </span>
          <span className="sr-only">{gestureLabel(active.id)} enviado</span>
        </span>
      )}

      {open && (
        <>
          {/* Clicar fora fecha. Existe como <button> e não como <div>
              para que Escape e o toque tenham o mesmo caminho. */}
          <button
            type="button"
            aria-label="Fechar gestos"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-van-deep/30"
          />

          {/* Ancorada no centro da TELA, não no botão: o botão vive no
              canto direito do rodapé, e um arco centrado nele jogaria
              metade dos gestos para fora do celular. */}
          <div
            className="fixed bottom-28 left-1/2 z-40 size-0 [--wheel-r:min(6.2rem,34vw)]"
            role="menu"
            aria-label="Gestos"
          >
            {GESTURES.map((gesture, index) => {
              // Meia-lua para cima: a roda cheia jogaria metade dos
              // gestos para baixo da borda da tela.
              const angle = Math.PI + (index / (GESTURES.length - 1)) * Math.PI;
              const x = Math.cos(angle).toFixed(4);
              const y = Math.sin(angle).toFixed(4);

              return (
                <button
                  key={gesture.id}
                  role="menuitem"
                  onClick={() => {
                    onGesture(gesture.id);
                    setOpen(false);
                  }}
                  title={gesture.label}
                  aria-label={gesture.label}
                  // `left`/`top` em vez de `transform`: o transform já é
                  // do Tailwind, para centrar o botão no ponto do arco.
                  style={{ left: `calc(${x} * var(--wheel-r))`, top: `calc(${y} * var(--wheel-r))` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 grid size-12 place-items-center rounded-full border-2 border-outline bg-cream text-2xl shadow-[0_3px_0_0_var(--outline)] transition-transform duration-100 ease-(--ease-toy) hover:scale-110 active:translate-y-[3px] active:shadow-none"
                >
                  <span aria-hidden>{gesture.icon}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <ToyButton
        size="sm"
        variant={open ? "cream" : "banana"}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative z-40"
      >
        Gestos <span className="ml-1 font-mono text-[10px] opacity-60">G</span>
      </ToyButton>

      <ToyButton
        size="sm"
        variant="alerta"
        onClick={() => onGesture(SLAP.id)}
        title={SLAP.label}
        className="relative z-40"
      >
        {SLAP.icon}
      </ToyButton>
    </div>
  );
}
