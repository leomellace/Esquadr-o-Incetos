"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentProfile } from "@/components/NameGate";
import { joinRoomByCode, RoomActionError } from "@/lib/game/roomActions";
import { normalizeRoomCode } from "@/lib/game/roomCode";
import { Panel } from "@/components/ui/Panel";
import { ToyButton } from "@/components/ui/ToyButton";

export default function EntrarSalaPage() {
  const profile = useCurrentProfile();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      const room = await joinRoomByCode(code, profile.id);
      router.push(`/sala/${room.code}`);
    } catch (err) {
      setError(err instanceof RoomActionError ? err.message : "Erro ao entrar na sala.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <Panel title="Entrar com código" screws>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoin();
          }}
          className="flex flex-col gap-4"
        >
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
            maxLength={6}
            placeholder="AB2K9X"
            className="rounded-xl border-2 border-outline bg-cream px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.3em] text-outline uppercase outline-none"
          />

          {error && <p className="text-center text-sm text-alerta">{error}</p>}

          <ToyButton
            type="submit"
            size="lg"
            variant="circuito"
            className="w-full"
            disabled={busy || code.length !== 6}
          >
            {busy ? "Entrando..." : "Entrar"}
          </ToyButton>
        </form>
      </Panel>
    </main>
  );
}
