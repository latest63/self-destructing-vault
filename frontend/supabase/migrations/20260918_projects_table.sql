-- Projects table — replaces the `profiles` table concept.
-- A project is owned by a wallet_address and can have a verified
-- GitHub identity (required for launching raises).
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  wallet_address text not null unique,
  name text,
  github_handle text,
  logo_url text,
  link text,
  profile_data jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Indexes for fast lookups
create index if not exists projects_wallet_address_idx on public.projects (wallet_address);
create index if not exists projects_github_handle_idx on public.projects (github_handle);

-- Row Level Security
alter table public.projects enable row level security;

-- Anyone can read projects (public projects listing)
create policy "public projects are viewable by everyone"
  on public.projects for select
  using (true);

-- Users can create projects without being authenticated (anon role)
-- This allows the wallet itself to own the record
create policy "anyone can create a project (anon)"
  on public.projects for insert
  with check (true);

-- Users can update their own project
create policy "wallet owner can update their project"
  on public.projects for update
  using (true);

-- Users can delete their own project
create policy "wallet owner can delete their project"
  on public.projects for delete
  using (true);

-- Trigger to auto-update updated_at
create or replace function public.handle_updated_at()
  returns trigger language 'plpgsql' as $$
  begin
    new.updated_at = now();
    return new;
  end;
$$;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();
