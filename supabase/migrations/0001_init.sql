-- Esquadrão InCetos — schema dedicado, isolado de outros produtos no mesmo projeto Supabase.
create schema if not exists incetos;

grant usage on schema incetos to anon, authenticated, service_role;
alter default privileges in schema incetos grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema incetos grant usage, select on sequences to anon, authenticated;

-- ============ profiles ============
create table incetos.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar_key text not null default 'macaco-01',
  cvd_mode text not null default 'none' check (cvd_mode in ('none', 'protan_deutan', 'tritan')),
  created_at timestamptz not null default now()
);

alter table incetos.profiles enable row level security;

create policy "profiles_select_all" on incetos.profiles
  for select using (true);

create policy "profiles_upsert_own" on incetos.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on incetos.profiles
  for update using (auth.uid() = id);

-- ============ rooms ============
create table incetos.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  host_id uuid not null references incetos.profiles(id) on delete cascade,
  mode text not null check (mode in ('campaign', 'endless', 'custom')),
  status text not null default 'lobby' check (status in ('lobby', 'in_progress', 'finished', 'closed')),
  config jsonb not null default '{}'::jsonb,
  seed bigint not null,
  created_at timestamptz not null default now()
);

alter table incetos.rooms enable row level security;

-- ============ room_members ============
create table incetos.room_members (
  room_id uuid not null references incetos.rooms(id) on delete cascade,
  profile_id uuid not null references incetos.profiles(id) on delete cascade,
  role text not null check (role in ('cego', 'mudo', 'surdo')),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, profile_id),
  unique (room_id, role)
);

alter table incetos.room_members enable row level security;

-- security definer helper: evita recursão de RLS entre rooms e room_members
create or replace function incetos.is_room_member(target_room uuid, target_profile uuid)
returns boolean
language sql
security definer
set search_path = incetos, public
stable
as $$
  select exists (
    select 1 from incetos.room_members
    where room_id = target_room and profile_id = target_profile
  );
$$;

create policy "rooms_select_members" on incetos.rooms
  for select using (incetos.is_room_member(id, auth.uid()));

create policy "rooms_insert_as_host" on incetos.rooms
  for insert with check (auth.uid() = host_id);

create policy "rooms_update_host" on incetos.rooms
  for update using (auth.uid() = host_id);

create policy "room_members_select_same_room" on incetos.room_members
  for select using (incetos.is_room_member(room_id, auth.uid()));

create policy "room_members_insert_self" on incetos.room_members
  for insert with check (auth.uid() = profile_id);

create policy "room_members_update_self" on incetos.room_members
  for update using (auth.uid() = profile_id);

create policy "room_members_delete_self" on incetos.room_members
  for delete using (auth.uid() = profile_id);

-- ============ campaign_levels ============
create table incetos.campaign_levels (
  id serial primary key,
  slug text not null unique,
  "order" int not null unique,
  title text not null,
  module_ids text[] not null,
  threat_ids text[] not null default '{}',
  time_limit_s int not null,
  max_strikes int not null default 3,
  difficulty int not null check (difficulty between 1 and 10)
);

alter table incetos.campaign_levels enable row level security;

create policy "campaign_levels_select_all" on incetos.campaign_levels
  for select using (true);

-- ============ matches ============
create table incetos.matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references incetos.rooms(id) on delete cascade,
  level_id int references incetos.campaign_levels(id),
  seed bigint not null,
  result text check (result in ('defused', 'exploded', 'abandoned')),
  strikes int not null default 0,
  time_left_ms int,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table incetos.matches enable row level security;

create policy "matches_select_room_members" on incetos.matches
  for select using (incetos.is_room_member(room_id, auth.uid()));

create policy "matches_insert_room_members" on incetos.matches
  for insert with check (incetos.is_room_member(room_id, auth.uid()));

-- ============ match_events (action log para validação/replay) ============
create table incetos.match_events (
  id bigserial primary key,
  match_id uuid not null references incetos.matches(id) on delete cascade,
  profile_id uuid not null references incetos.profiles(id),
  seq int not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (match_id, seq)
);

alter table incetos.match_events enable row level security;

create policy "match_events_select_room_members" on incetos.match_events
  for select using (
    exists (
      select 1 from incetos.matches m
      where m.id = match_id and incetos.is_room_member(m.room_id, auth.uid())
    )
  );

create policy "match_events_insert_room_members" on incetos.match_events
  for insert with check (
    exists (
      select 1 from incetos.matches m
      where m.id = match_id and incetos.is_room_member(m.room_id, auth.uid())
    )
  );

-- ============ progress ============
create table incetos.progress (
  profile_id uuid not null references incetos.profiles(id) on delete cascade,
  level_id int not null references incetos.campaign_levels(id),
  best_time_ms int,
  stars smallint not null default 0 check (stars between 0 and 3),
  cleared_at timestamptz,
  primary key (profile_id, level_id)
);

alter table incetos.progress enable row level security;

create policy "progress_select_own" on incetos.progress
  for select using (auth.uid() = profile_id);

create policy "progress_upsert_own" on incetos.progress
  for insert with check (auth.uid() = profile_id);

create policy "progress_update_own" on incetos.progress
  for update using (auth.uid() = profile_id);
