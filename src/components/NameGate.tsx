"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useProfile } from "@/hooks/useProfile";
import { ToyButton } from "@/components/ui/ToyButton";
import { Panel } from "@/components/ui/Panel";
import type { Database } from "@/types/database";

type Profile = Database["incetos"]["Tables"]["profiles"]["Row"];

const ProfileContext = createContext<Profile | null>(null);

/** Perfil da sessão atual. Só chame dentro de <NameGate>. */
export function useCurrentProfile(): Profile {
  const profile = useContext(ProfileContext);
  if (!profile) {
    throw new Error("useCurrentProfile() usado fora de <NameGate>.");
  }
  return profile;
}

/**
 * Garante uma sessão + perfil antes de renderizar telas de sala, e
 * disponibiliza o perfil via contexto para qualquer descendente
 * (páginas, layouts). Deixa o nome sugerido editável de cara — sem
 * tela de cadastro separada, porque o jogador só quer entrar na van
 * o quanto antes.
 */
export function NameGate({ children }: { children: ReactNode }) {
  const { profile, loading, error, updateDisplayName } = useProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center p-8">
        <p className="animate-pulse font-mono text-sm text-cream-dim">
          entrando na van...
        </p>
      </div>
    );
  }

  if (error) {
    const isAnonDisabled = error.toLowerCase().includes("anonymous");
    return (
      <div className="grid flex-1 place-items-center p-8">
        <Panel title="Não foi possível entrar" className="max-w-md text-center">
          <p className="text-sm text-cream">
            {isAnonDisabled
              ? "O login anônimo ainda não está ativado no Supabase deste projeto."
              : error}
          </p>
          {isAnonDisabled && (
            <p className="mt-2 font-mono text-xs text-cream-dim">
              Authentication → Sign In / Providers → Anonymous Sign-ins
            </p>
          )}
        </Panel>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <ProfileContext.Provider value={profile}>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-van-deep/80 p-6 backdrop-blur-sm">
          <Panel title="Como você quer ser chamado?" screws className="w-full max-w-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateDisplayName(draft || profile.display_name);
                setEditing(false);
              }}
              className="flex flex-col gap-3"
            >
              <input
                autoFocus
                maxLength={24}
                defaultValue={profile.display_name}
                onChange={(e) => setDraft(e.target.value)}
                className="rounded-xl border-2 border-outline bg-cream px-4 py-2.5 font-display text-lg text-outline outline-none"
              />
              <div className="flex justify-end gap-2">
                <ToyButton type="button" size="sm" variant="panel" onClick={() => setEditing(false)}>
                  Cancelar
                </ToyButton>
                <ToyButton type="submit" size="sm" variant="banana">
                  Salvar
                </ToyButton>
              </div>
            </form>
          </Panel>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-4 pt-3 sm:px-6">
        <button
          onClick={() => {
            setDraft(profile.display_name);
            setEditing(true);
          }}
          className="font-mono text-xs text-cream-dim underline decoration-dotted hover:text-cream"
        >
          {profile.display_name}
        </button>
      </div>

      {children}
    </ProfileContext.Provider>
  );
}
