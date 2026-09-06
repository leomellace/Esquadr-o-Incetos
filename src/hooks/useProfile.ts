"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { suggestAvatarKey, suggestDisplayName } from "@/lib/game/names";
import type { Database } from "@/types/database";

type Profile = Database["incetos"]["Tables"]["profiles"]["Row"];

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateDisplayName: (name: string) => Promise<void>;
}

/**
 * Garante uma sessão (anônima, se preciso) e a linha de perfil
 * correspondente. Todo o resto do app assume que, passado o `loading`,
 * ou existe um `profile` ou existe um `error` — nunca os dois nulos.
 */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserClient();

    async function ensureProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let userId = session?.user.id;

      if (!userId) {
        const { data, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
        userId = data.user?.id;
      }

      if (!userId) throw new Error("Não foi possível iniciar uma sessão.");

      const { data: existing, error: selectError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (selectError) throw selectError;
      if (existing) return existing;

      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          display_name: suggestDisplayName(),
          avatar_key: suggestAvatarKey(),
        })
        .select("*")
        .single();

      if (insertError) throw insertError;
      return created;
    }

    ensureProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro desconhecido");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateDisplayName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const supabase = getBrowserClient();
    setProfile((prev) => (prev ? { ...prev, display_name: trimmed } : prev));

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

    if (updateError) setError(updateError.message);
  }, []);

  return { profile, loading, error, updateDisplayName };
}
