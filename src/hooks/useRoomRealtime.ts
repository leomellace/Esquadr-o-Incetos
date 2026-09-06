"use client";

import { useEffect, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { useRoomStore } from "@/store/roomStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Args {
  roomCode: string;
  selfProfileId: string;
  selfDisplayName: string;
}

/**
 * Carrega o estado inicial da sala e mantém tudo sincronizado por
 * Realtime: mudanças em `rooms`/`room_members` (banco) e presença
 * (quem está com a aba aberta agora, efêmero, não gravado no banco).
 *
 * Duas fontes de verdade de propósito: `is_ready` sobrevive a um
 * refresh, `online` não deveria — ninguém quer aparecer "pronto e
 * online" para sempre porque fechou a aba sem sair da sala.
 */
export function useRoomRealtime({ roomCode, selfProfileId, selfDisplayName }: Args) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const store = useRoomStore;

  useEffect(() => {
    const supabase = getBrowserClient();
    let cancelled = false;

    store.getState().reset();
    store.getState().setSelf(selfProfileId);

    async function load() {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode)
        .maybeSingle();

      if (roomError || !room || cancelled) return;
      store.getState().setRoom(room);

      // Duas queries em vez de um embed `profiles(...)`: o PostgREST
      // resolveria o embed via metadados de FK que não declaramos no
      // tipo Database (Relationships fica vazio de propósito — ver
      // types/database.ts), então o embed tipava como `never`.
      const { data: members } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", room.id);

      if (cancelled) return;

      const profileIds = (members ?? []).map((m) => m.profile_id);
      const { data: profiles } = profileIds.length
        ? await supabase.from("profiles").select("id, display_name, avatar_key").in("id", profileIds)
        : { data: [] };

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

      for (const m of members ?? []) {
        const p = profileById.get(m.profile_id);

        store.getState().upsertMember({
          profileId: m.profile_id,
          displayName: p?.display_name ?? "???",
          avatarKey: p?.avatar_key ?? "macaco-01",
          role: m.role,
          isReady: m.is_ready,
          isHost: m.profile_id === room.host_id,
        });
      }

      const channel = supabase
        .channel(`room:${room.id}`, { config: { presence: { key: selfProfileId } } })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "incetos",
            table: "room_members",
            filter: `room_id=eq.${room.id}`,
          },
          async (payload) => {
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as { profile_id: string };
              store.getState().removeMember(oldRow.profile_id);
              return;
            }

            const row = payload.new as {
              profile_id: string;
              role: RoomMemberRole;
              is_ready: boolean;
            };

            // A mudança já chegou; buscamos o nome só se ainda não o
            // conhecemos (evita 1 round-trip por evento de ready-toggle).
            const known = store.getState().members[row.profile_id];
            let displayName = known?.displayName;
            let avatarKey = known?.avatarKey;

            if (!displayName) {
              const { data: p } = await supabase
                .from("profiles")
                .select("display_name, avatar_key")
                .eq("id", row.profile_id)
                .maybeSingle();
              displayName = p?.display_name ?? "???";
              avatarKey = p?.avatar_key ?? "macaco-01";
            }

            store.getState().upsertMember({
              profileId: row.profile_id,
              displayName,
              avatarKey,
              role: row.role,
              isReady: row.is_ready,
              isHost: row.profile_id === room.host_id,
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "incetos",
            table: "rooms",
            filter: `id=eq.${room.id}`,
          },
          (payload) => {
            store.getState().setRoom(payload.new as typeof room);
          },
        )
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<{ profileId: string }>();
          const onlineIds = new Set(Object.keys(state));
          for (const id of Object.keys(store.getState().members)) {
            store.getState().setOnline(id, onlineIds.has(id));
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ profileId: selfProfileId, displayName: selfDisplayName });
          }
        });

      channelRef.current = channel;
    }

    load();

    return () => {
      cancelled = true;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [roomCode, selfProfileId, selfDisplayName, store]);
}

type RoomMemberRole = "cego" | "mudo" | "surdo" | null;
