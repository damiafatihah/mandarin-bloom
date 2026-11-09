-- 学海 Xuéhǎi: cloud copy of each learner's progress, for syncing between devices.
-- Run once in Supabase → SQL Editor → New query → Run.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Row level security: each signed-in person can only see and change their own row.
alter table public.progress enable row level security;

create policy "read own progress" on public.progress
  for select using (auth.uid() = user_id);

create policy "add own progress" on public.progress
  for insert with check (auth.uid() = user_id);

create policy "update own progress" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
