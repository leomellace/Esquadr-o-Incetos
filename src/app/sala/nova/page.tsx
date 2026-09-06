"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentProfile } from "@/components/NameGate";
import { createRoom, RoomActionError } from "@/lib/game/roomActions";
import { Panel } from "@/components/ui/Panel";
import { ToyButton } from "@/components/ui/ToyButton";
import type { RoomMode } from "@/types/database";

const MODES: { value: RoomMode; label: string; desc: string }[] = [
  { value: "campaign", label: "Campanha", desc: "30 fases, dificuldade progressiva" },
  { value: "endless", label: "Infinito", desc: "ondas geradas até vocês errarem" },
  { value: "custom", label: "Personalizado", desc: "ajuste tempo, módulos e erros" },
];

export default function NovaSalaPage() {
  const profile = useCurrentProfile();
  const router = useRouter();
  const [mode, setMode] = useState<RoomMode>("campaign");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom(profile.id, mode);
      router.push(`/sala/${room.code}`);
    } catch (err) {
      setError(err instanceof RoomActionError ? err.message : "Erro ao criar sala.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
      <Panel title="Criar sala" screws>
        <div className="flex flex-col gap-3">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={[
                "flex flex-col items-start gap-0.5 rounded-xl border-2 border-outline px-4 py-3 text-left transition-colors",
                mode === m.value ? "bg-banana text-ink-play" : "bg-panel-hi text-cream",
              ].join(" ")}
            >
              <span className="font-display text-lg font-semibold">{m.label}</span>
              <span className="text-sm opacity-80">{m.desc}</span>
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-alerta">{error}</p>}

        <ToyButton
          size="lg"
          variant="circuito"
          className="mt-6 w-full"
          onClick={handleCreate}
          disabled={busy}
        >
          {busy ? "Criando..." : "Criar sala"}
        </ToyButton>
      </Panel>
    </main>
  );
}
