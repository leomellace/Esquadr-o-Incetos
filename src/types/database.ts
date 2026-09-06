// Tipos gerados manualmente na F0 — serão substituídos por
// `supabase gen types typescript` assim que o projeto remoto existir.
// Mantém o schema em sincronia com supabase/migrations/0001_init.sql.

export type Role = "cego" | "mudo" | "surdo";
export type RoomMode = "campaign" | "endless" | "custom";
export type RoomStatus = "lobby" | "in_progress" | "finished" | "closed";
export type CvdMode = "none" | "protan_deutan" | "tritan";
export type MatchResult = "defused" | "exploded" | "abandoned";

export interface Database {
  incetos: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_key: string;
          cvd_mode: CvdMode;
          created_at: string;
        };
        Insert: Partial<Database["incetos"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          display_name: string;
        };
        Update: Partial<Database["incetos"]["Tables"]["profiles"]["Row"]>;
      };
      rooms: {
        Row: {
          id: string;
          code: string;
          host_id: string;
          mode: RoomMode;
          status: RoomStatus;
          config: Record<string, unknown>;
          seed: number;
          created_at: string;
        };
        Insert: Partial<Database["incetos"]["Tables"]["rooms"]["Row"]> & {
          code: string;
          host_id: string;
          mode: RoomMode;
          seed: number;
        };
        Update: Partial<Database["incetos"]["Tables"]["rooms"]["Row"]>;
      };
      room_members: {
        Row: {
          room_id: string;
          profile_id: string;
          role: Role;
          is_ready: boolean;
          joined_at: string;
        };
        Insert: Partial<Database["incetos"]["Tables"]["room_members"]["Row"]> & {
          room_id: string;
          profile_id: string;
          role: Role;
        };
        Update: Partial<Database["incetos"]["Tables"]["room_members"]["Row"]>;
      };
      campaign_levels: {
        Row: {
          id: number;
          slug: string;
          order: number;
          title: string;
          module_ids: string[];
          threat_ids: string[];
          time_limit_s: number;
          max_strikes: number;
          difficulty: number;
        };
        Insert: Partial<Database["incetos"]["Tables"]["campaign_levels"]["Row"]>;
        Update: Partial<Database["incetos"]["Tables"]["campaign_levels"]["Row"]>;
      };
      matches: {
        Row: {
          id: string;
          room_id: string;
          level_id: number | null;
          seed: number;
          result: MatchResult | null;
          strikes: number;
          time_left_ms: number | null;
          started_at: string;
          ended_at: string | null;
        };
        Insert: Partial<Database["incetos"]["Tables"]["matches"]["Row"]> & {
          room_id: string;
          seed: number;
        };
        Update: Partial<Database["incetos"]["Tables"]["matches"]["Row"]>;
      };
      match_events: {
        Row: {
          id: number;
          match_id: string;
          profile_id: string;
          seq: number;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["incetos"]["Tables"]["match_events"]["Row"]> & {
          match_id: string;
          profile_id: string;
          seq: number;
          payload: Record<string, unknown>;
        };
        Update: Partial<Database["incetos"]["Tables"]["match_events"]["Row"]>;
      };
      progress: {
        Row: {
          profile_id: string;
          level_id: number;
          best_time_ms: number | null;
          stars: number;
          cleared_at: string | null;
        };
        Insert: Partial<Database["incetos"]["Tables"]["progress"]["Row"]> & {
          profile_id: string;
          level_id: number;
        };
        Update: Partial<Database["incetos"]["Tables"]["progress"]["Row"]>;
      };
    };
  };
}
