-- ====================================================================
-- SpoPlayer Cloud Schema for Supabase
-- Ejecuta este script en el SQL Editor de tu panel de Supabase
-- ====================================================================

-- 1. Tabla de Playlists
create table if not exists public.playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  is_public boolean default false,
  revision integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabla de Canciones dentro de las Playlists
create table if not exists public.playlist_tracks (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references public.playlists(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  track_id text not null,
  track_data jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabla de Favoritos ("Mis Me Gustas")
create table if not exists public.likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  track_id text not null,
  track_data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, track_id)
);

-- 4. Tabla de Ajustes de Usuario en la Nube
create table if not exists public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ====================================================================
-- Índices para máximo rendimiento
-- ====================================================================
create index if not exists idx_playlists_user_id on public.playlists(user_id);
create index if not exists idx_playlist_tracks_playlist_id on public.playlist_tracks(playlist_id);
create index if not exists idx_playlist_tracks_user_id on public.playlist_tracks(user_id);
create index if not exists idx_likes_user_id on public.likes(user_id);
create index if not exists idx_likes_user_track on public.likes(user_id, track_id);

-- ====================================================================
-- Row Level Security (RLS) - Cada usuario solo accede a sus propios datos
-- ====================================================================
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.likes enable row level security;
alter table public.user_settings enable row level security;

-- Políticas para playlists
create policy "Users can view own playlists"
  on public.playlists for select
  using (auth.uid() = user_id);

create policy "Users can insert own playlists"
  on public.playlists for insert
  with check (auth.uid() = user_id);

create policy "Users can update own playlists"
  on public.playlists for update
  using (auth.uid() = user_id);

create policy "Users can delete own playlists"
  on public.playlists for delete
  using (auth.uid() = user_id);

-- Políticas para playlist_tracks
create policy "Users can view own playlist tracks"
  on public.playlist_tracks for select
  using (auth.uid() = user_id);

create policy "Users can insert own playlist tracks"
  on public.playlist_tracks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own playlist tracks"
  on public.playlist_tracks for update
  using (auth.uid() = user_id);

create policy "Users can delete own playlist tracks"
  on public.playlist_tracks for delete
  using (auth.uid() = user_id);

-- Políticas para likes
create policy "Users can view own likes"
  on public.likes for select
  using (auth.uid() = user_id);

create policy "Users can insert own likes"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own likes"
  on public.likes for delete
  using (auth.uid() = user_id);

-- Políticas para user_settings
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can upsert own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
