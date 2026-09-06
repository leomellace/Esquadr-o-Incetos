"use client";

import { useEffect, useState } from "react";
import { ToyButton } from "@/components/ui/ToyButton";
import { ColorChip } from "@/components/ui/ColorChip";
import { LcdTimer } from "@/components/ui/LcdTimer";
import { Panel } from "@/components/ui/Panel";
import { RoleCard } from "@/components/ui/RoleCard";
import {
  CVD_LABELS,
  CVD_MODES,
  PLAY_COLORS,
  type CvdMode,
} from "@/lib/design/palette";
import type { Role } from "@/types/database";

const ROLES: Role[] = ["cego", "mudo", "surdo"];

export default function DesignSystemPage() {
  const [cvd, setCvd] = useState<CvdMode>("none");
  const [ms, setMs] = useState(154_000);
  const [role, setRole] = useState<Role>("surdo");

  useEffect(() => {
    document.documentElement.dataset.cvd = cvd;
  }, [cvd]);

  useEffect(() => {
    const id = setInterval(() => setMs((v) => (v <= 0 ? 154_000 : v - 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header className="mb-10">
        <p className="font-mono text-xs tracking-[0.3em] text-cream-dim uppercase">
          F1 · Design System
        </p>
        <h1 className="font-display text-6xl font-bold tracking-tight text-cream">
          Esquadrão InCetos
        </h1>
        <p className="mt-2 max-w-xl text-cream-dim">
          Direção: <strong className="text-cream">plástico injetado</strong>.
          Peças grossas com contorno preto, sombra dura e luz quente de
          lâmpada — tudo na tela deveria parecer que pode ser apertado.
        </p>
      </header>

      <div className="grid gap-6">
        <Panel title="Modo de daltonismo" screws>
          <div className="flex flex-wrap items-center gap-3">
            {CVD_MODES.map((mode) => (
              <ToyButton
                key={mode}
                size="sm"
                variant={mode === cvd ? "cream" : "panel"}
                onClick={() => setCvd(mode)}
              >
                {CVD_LABELS[mode]}
              </ToyButton>
            ))}
          </div>
          <p className="mt-4 text-sm text-cream-dim">
            Troque o modo e observe as cores abaixo mudarem — mas repare que os
            glifos <strong className="text-cream">não mudam</strong>. É o glifo
            que carrega a informação; a cor só acelera o reconhecimento.
          </p>
        </Panel>

        <Panel title="Cores de jogo" screws>
          <div className="flex flex-wrap gap-6">
            {PLAY_COLORS.map((color) => (
              <ColorChip key={color} color={color} size="lg" showLabel />
            ))}
          </div>
          <p className="mt-5 text-sm text-cream-dim">
            O nome falado embaixo de cada peça é o vocabulário do trio. O Surdo
            vê a cor, mas precisa dizer{" "}
            <em className="text-cream">&ldquo;aperta o triângulo&rdquo;</em> — porque
            o Cego, do outro lado, nunca vai saber o que é vermelho.
          </p>
        </Panel>

        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          <Panel title="Visor" className="grid place-items-center">
            <LcdTimer ms={ms} strikes={1} maxStrikes={3} />
          </Panel>

          <Panel title="Botões">
            <div className="flex flex-wrap items-end gap-3">
              <ToyButton size="lg" variant="banana">
                Criar sala
              </ToyButton>
              <ToyButton size="md" variant="alerta">
                Cortar cabo
              </ToyButton>
              <ToyButton size="md" variant="circuito">
                Confirmar
              </ToyButton>
              <ToyButton size="sm" variant="panel">
                Opções
              </ToyButton>
              <ToyButton size="sm" variant="cream" disabled>
                Aguardando
              </ToyButton>
            </div>
            <p className="mt-5 text-sm text-cream-dim">
              A sombra dura é a espessura da peça. Ao apertar, o botão desce
              exatamente a altura da própria sombra e encosta na superfície.
            </p>
          </Panel>
        </div>

        <Panel title="Papéis">
          <div className="grid gap-4 sm:grid-cols-3">
            {ROLES.map((r) => (
              <RoleCard
                key={r}
                role={r}
                selected={role === r}
                onSelect={() => setRole(r)}
                takenBy={r === "cego" ? "Zé" : null}
              />
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}
