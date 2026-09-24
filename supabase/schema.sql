create extension if not exists pgcrypto;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  currency text not null,
  organizer_token_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  origin text,
  start_date date,
  end_date date,
  budget numeric,
  destination_type text,
  excluded_destinations jsonb not null default '[]',
  preferences text not null default '',
  dealbreakers text not null default '',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trip_id, name)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  status text not null check (status in ('ready','conflict','locked')),
  issues jsonb not null default '[]',
  created_at timestamptz not null default now(),
  locked_option_id uuid
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  city text not null,
  country text not null,
  iata text not null,
  destination_type text not null,
  reason text not null,
  score integer not null,
  total_cost numeric not null,
  quote jsonb not null,
  positions jsonb not null
);

create table if not exists public.votes (
  round_id uuid not null references public.rounds(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  option_id uuid not null references public.options(id) on delete cascade,
  primary key (round_id, member_id)
);

alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.rounds enable row level security;
alter table public.options enable row level security;
alter table public.votes enable row level security;
revoke all on public.trips, public.members, public.rounds, public.options, public.votes from anon, authenticated;
grant all on public.trips, public.members, public.rounds, public.options, public.votes to service_role;
