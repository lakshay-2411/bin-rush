-- Bin Rush schema. Run this once in the Supabase SQL editor.
-- Only the Next.js server talks to these tables (with the secret / service-role key),
-- so RLS is enabled with no policies: the public anon key can't read or write anything.

create table if not exists users (
  id text primary key,                 -- Clerk user id (user_...)
  email text not null,                 -- Clerk primary email
  display_name text not null,          -- Clerk username
  created_at timestamptz not null default now()
);

create table if not exists rounds (
  id bigint generated always as identity primary key,
  user_id text not null references users(id) on delete cascade,
  date date not null,                  -- player's local date when the round started
  answers jsonb,                       -- [{ itemId, bin | null, ms }]
  score integer not null default 0,
  accuracy real not null default 0,    -- 0..1
  max_combo integer not null default 0,
  boss_correct boolean not null default false,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,            -- null = started but never submitted (counts as 0)
  unique (user_id, date)
);

create index if not exists rounds_leaderboard_idx
  on rounds (date, score desc, accuracy desc, submitted_at)
  where submitted_at is not null;

create table if not exists user_progress (
  user_id text primary key references users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_played_date date,
  xp integer not null default 0,
  best_score integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists user_badges (
  user_id text not null references users(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table users enable row level security;
alter table rounds enable row level security;
alter table user_progress enable row level security;
alter table user_badges enable row level security;
