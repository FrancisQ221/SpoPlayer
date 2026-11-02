-- ============================================================
-- SpoPlayer — Tablas necesarias en Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── TABLA: likes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id    text NOT NULL,
  track_data  jsonb,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, track_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_likes" ON public.likes
  FOR ALL USING (auth.uid() = user_id);

-- ─── TABLA: playlists ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.playlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  is_public   boolean DEFAULT false,
  cover_url   text,
  revision    integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_playlists" ON public.playlists
  FOR ALL USING (auth.uid() = user_id);

-- ─── TABLA: playlist_tracks ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id  uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id     text NOT NULL,
  track_data   jsonb,
  position     integer DEFAULT 0,
  added_at     timestamptz DEFAULT now()
);

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_playlist_tracks" ON public.playlist_tracks
  FOR ALL USING (
    auth.uid() = (
      SELECT user_id FROM public.playlists WHERE id = playlist_id
    )
  );

-- ─── Trigger: updated_at en playlists ────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
