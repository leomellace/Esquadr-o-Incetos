// Tipos gerados manualmente na F0 — serão substituídos por
// `supabase gen types typescript` assim que tivermos login no CLI.
// Mantém o schema em sincronia com supabase/migrations/*.sql.
//
// O client do supabase-js exige que cada tabela tenha exatamente o
// formato { Row, Insert, Update, Relationships } e que o schema tenha
// { Tables, Views, Functions } — sem isso a inferência de tipos de
// `.from()` colapsa silenciosamente para `never` em vez de dar erro
// claro. É o que aconteceu aqui na primeira versão deste arquivo.
type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Role = "cego" | "mudo" | "surdo";
export type RoomMode = "campaign" | "endless" | "custom";
export type RoomStatus = "lobby" | "in_progress" | "finished" | "closed";
export type CvdMode = "none" | "protan_deutan" | "tritan";
export type MatchResult = "defused" | "exploded" | "abandoned";

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_key: string;
  cvd_mode: CvdMode;
  created_at: string;
};

type RoomRow = {
  id: string;
  code: string;
  host_id: string;
  mode: RoomMode;
  status: RoomStatus;
  config: Record<string, unknown>;
  seed: number;
  created_at: string;
};

type RoomMemberRow = {
  room_id: string;
  profile_id: string;
  role: Role | null;
  is_ready: boolean;
  joined_at: string;
};

type CampaignLevelRow = {
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

type MatchRow = {
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

type MatchEventRow = {
  id: number;
  match_id: string;
  profile_id: string;
  seq: number;
  payload: Record<string, unknown>;
  created_at: string;
};

type ProgressRow = {
  profile_id: string;
  level_id: number;
  best_time_ms: number | null;
  stars: number;
  cleared_at: string | null;
};

export interface Database {
  incetos: {
    Tables: {
      profiles: Table<ProfileRow, Partial<ProfileRow> & { id: string; display_name: string }>;
      rooms: Table<
        RoomRow,
        Partial<RoomRow> & { code: string; host_id: string; mode: RoomMode; seed: number }
      >;
      room_members: Table<
        RoomMemberRow,
        Partial<RoomMemberRow> & { room_id: string; profile_id: string }
      >;
      campaign_levels: Table<CampaignLevelRow, Partial<CampaignLevelRow>>;
      matches: Table<MatchRow, Partial<MatchRow> & { room_id: string; seed: number }>;
      match_events: Table<
        MatchEventRow,
        Partial<MatchEventRow> & {
          match_id: string;
          profile_id: string;
          seq: number;
          payload: Record<string, unknown>;
        }
      >;
      progress: Table<ProgressRow, Partial<ProgressRow> & { profile_id: string; level_id: number }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
