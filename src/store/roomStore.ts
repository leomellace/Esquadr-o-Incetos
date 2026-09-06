import { create } from "zustand";
import type { Database, Role } from "@/types/database";

type RoomRow = Database["incetos"]["Tables"]["rooms"]["Row"];

export interface RoomMemberState {
  profileId: string;
  displayName: string;
  avatarKey: string;
  role: Role | null;
  isReady: boolean;
  isHost: boolean;
  online: boolean;
}

interface RoomStoreState {
  room: RoomRow | null;
  members: Record<string, RoomMemberState>;
  selfId: string | null;

  setRoom: (room: RoomRow | null) => void;
  setSelf: (profileId: string) => void;
  upsertMember: (member: Partial<RoomMemberState> & { profileId: string }) => void;
  removeMember: (profileId: string) => void;
  setOnline: (profileId: string, online: boolean) => void;
  reset: () => void;
}

/**
 * Estado ao vivo de uma sala: quem está nela, qual papel escolheu,
 * se está pronto, se está online. Alimentado por useRoomRealtime;
 * lido por toda a UI do lobby sem prop drilling.
 */
export const useRoomStore = create<RoomStoreState>((set) => ({
  room: null,
  members: {},
  selfId: null,

  setRoom: (room) => set({ room }),
  setSelf: (profileId) => set({ selfId: profileId }),

  upsertMember: (patch) =>
    set((state) => {
      const prev = state.members[patch.profileId];
      return {
        members: {
          ...state.members,
          [patch.profileId]: {
            profileId: patch.profileId,
            displayName: patch.displayName ?? prev?.displayName ?? "???",
            avatarKey: patch.avatarKey ?? prev?.avatarKey ?? "macaco-01",
            role: patch.role !== undefined ? patch.role : (prev?.role ?? null),
            isReady: patch.isReady ?? prev?.isReady ?? false,
            isHost: patch.isHost ?? prev?.isHost ?? false,
            online: patch.online ?? prev?.online ?? false,
          },
        },
      };
    }),

  removeMember: (profileId) =>
    set((state) => {
      const next = { ...state.members };
      delete next[profileId];
      return { members: next };
    }),

  setOnline: (profileId, online) =>
    set((state) => {
      const prev = state.members[profileId];
      if (!prev) return state;
      return { members: { ...state.members, [profileId]: { ...prev, online } } };
    }),

  reset: () => set({ room: null, members: {}, selfId: null }),
}));
