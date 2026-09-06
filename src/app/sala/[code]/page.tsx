"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentProfile } from "@/components/NameGate";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { useRoomStore } from "@/store/roomStore";
import { selectRole, setReady, leaveRoom, RoomActionError } from "@/lib/game/roomActions";
import { Panel } from "@/components/ui/Panel";
import { ToyButton } from "@/components/ui/ToyButton";
import { RoleCard } from "@/components/ui/RoleCard";
import type { Role } from "@/types/database";

const ROLES: Role[] = ["cego", "mudo", "surdo"];

export default function SalaPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const profile = useCurrentProfile();
  const router = useRouter();

  useRoomRealtime({
    roomCode: code,
    selfProfileId: profile.id,
    selfDisplayName: profile.display_name,
  });

  const room = useRoomStore((s) => s.room);
  const members = useRoomStore((s) => s.members);
  const memberList = Object.values(members);
  const self = members[profile.id];
  const [error, setError] = useState<string | null>(null);

  if (!room) {
    return (
      <div className="grid flex-1 place-items-center p-8">
        <p className="animate-pulse font-mono text-sm text-cream-dim">
          procurando a sala {code}...
        </p>
      </div>
    );
  }

  const roleOwner = (role: Role) => memberList.find((m) => m.role === role);

  async function handleSelectRole(role: Role) {
    setError(null);
    try {
      await selectRole(room!.id, profile.id, role);
    } catch (err) {
      setError(err instanceof RoomActionError ? err.message : "Erro ao escolher papel.");
    }
  }

  async function handleToggleReady() {
    if (!self) return;
    try {
      await setReady(room!.id, profile.id, !self.isReady);
    } catch (err) {
      setError(err instanceof RoomActionError ? err.message : "Erro ao marcar pronto.");
    }
  }

  async function handleLeave() {
    await leaveRoom(room!.id, profile.id);
    router.push("/");
  }

  const allRolesFilled = ROLES.every((r) => roleOwner(r));
  const allReady = memberList.length === 3 && memberList.every((m) => m.isReady);
  const isHost = self?.isHost;
  const canStart = allRolesFilled && allReady && isHost;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-cream-dim uppercase">
            Código da sala
          </p>
          <p className="font-mono text-4xl font-bold tracking-[0.2em] text-lcd">{room.code}</p>
        </div>
        <ToyButton size="sm" variant="panel" onClick={handleLeave}>
          Sair da sala
        </ToyButton>
      </header>

      {error && (
        <p className="rounded-xl border-2 border-outline bg-alerta px-4 py-2 text-sm font-semibold text-ink-play">
          {error}
        </p>
      )}

      <Panel title={`Escolham os papéis (${memberList.length}/3 na van)`}>
        <div className="grid gap-4 sm:grid-cols-3">
          {ROLES.map((role) => {
            const owner = roleOwner(role);
            return (
              <RoleCard
                key={role}
                role={role}
                selected={owner?.profileId === profile.id}
                takenBy={owner?.displayName ?? null}
                onSelect={() => handleSelectRole(role)}
              />
            );
          })}
        </div>
      </Panel>

      <Panel title="Quem está na van">
        <ul className="flex flex-col gap-2">
          {memberList.map((m) => (
            <li
              key={m.profileId}
              className="flex items-center justify-between rounded-xl border-2 border-outline bg-panel-hi px-4 py-2.5"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`size-2.5 rounded-full ${m.online ? "bg-circuito" : "bg-cream-dim/30"}`}
                />
                {m.displayName}
                {m.isHost && (
                  <span className="font-mono text-[10px] text-cream-dim uppercase">host</span>
                )}
              </span>
              <span
                className={`font-mono text-xs uppercase ${m.isReady ? "text-circuito" : "text-cream-dim"}`}
              >
                {m.isReady ? "pronto" : "aguardando"}
              </span>
            </li>
          ))}
          {memberList.length < 3 && (
            <li className="rounded-xl border-2 border-dashed border-outline px-4 py-2.5 text-center font-mono text-xs text-cream-dim uppercase">
              esperando mais {3 - memberList.length} macaco(s)
            </li>
          )}
        </ul>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToyButton
          size="md"
          variant={self?.isReady ? "panel" : "banana"}
          onClick={handleToggleReady}
          disabled={!self?.role}
        >
          {self?.isReady ? "Cancelar pronto" : "Estou pronto"}
        </ToyButton>

        {isHost && (
          <ToyButton size="lg" variant="circuito" disabled={!canStart}>
            {canStart ? "Iniciar (em breve)" : "Aguardando o trio"}
          </ToyButton>
        )}
      </div>
    </main>
  );
}
