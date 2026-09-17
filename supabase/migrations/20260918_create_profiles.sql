create table if not exists public.profiles (
 wallet_address text primary key,
 github_handle text,
 display_name text,
 avatar_url text,
 created_at timestamp with time zone default timezone('utc'::text, now()),
 updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists profiles_github_handle_idx on public.profiles(github_handle);

alter table public.profiles enable row level security;

create policy "Public profiles are visible to everyone"
 on public.profiles for select using (true);

create policy "Users can update their own profile"
 on public.profiles for all
 using (auth.uid()::text = wallet_address);
