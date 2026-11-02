/**
 * localLibraryStorage.ts
 * Almacenamiento local indestructible para likes y playlists en SpoPlayer.
 * Funciona offline, sin login obligatorio y se sincroniza con Supabase.
 */

import type { ApiTrack, ApiUserPlaylist, ApiUserPlaylistItem, ApiLikedTracksPage } from "@/shared/api";

const LIKES_KEY = "spoplayer:local:likes";
const PLAYLISTS_KEY = "spoplayer:local:playlists";
const PLAYLIST_TRACKS_KEY = "spoplayer:local:playlist_tracks";

export interface StoredLike {
  trackId: string;
  trackData: ApiTrack;
  createdAt: string;
}

export interface StoredPlaylist {
  id: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredPlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  trackData: ApiTrack;
  position: number;
  addedAt: string;
}

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export const localLibrary = {
  // ─── LIKES ──────────────────────────────────────────
  getLikes(): StoredLike[] {
    return safeGet<StoredLike[]>(LIKES_KEY, []);
  },

  likeTrack(trackId: string, trackData?: any): void {
    const likes = this.getLikes();
    if (!likes.some((l) => l.trackId === trackId)) {
      const parsed: ApiTrack = trackData?.id ? trackData : {
        id: trackId,
        title: trackData?.title || "Canción",
        artists: trackData?.artists || [{ id: "unknown", name: "Artista desconocido" }],
        durationMs: trackData?.durationMs || 0,
        cover: trackData?.cover,
      };
      likes.unshift({
        trackId,
        trackData: parsed,
        createdAt: new Date().toISOString(),
      });
      safeSet(LIKES_KEY, likes);
    }
  },

  unlikeTrack(trackId: string): void {
    const likes = this.getLikes().filter((l) => l.trackId !== trackId);
    safeSet(LIKES_KEY, likes);
  },

  // ─── PLAYLISTS ──────────────────────────────────────
  getPlaylists(): StoredPlaylist[] {
    return safeGet<StoredPlaylist[]>(PLAYLISTS_KEY, []);
  },

  getPlaylist(id: string): StoredPlaylist | undefined {
    return this.getPlaylists().find((p) => p.id === id);
  },

  createPlaylist(input: { title: string; description?: string; isPublic?: boolean }): StoredPlaylist {
    const playlists = this.getPlaylists();
    const now = new Date().toISOString();
    const newPl: StoredPlaylist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: input.title.trim(),
      description: input.description?.trim(),
      isPublic: input.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    };
    playlists.unshift(newPl);
    safeSet(PLAYLISTS_KEY, playlists);
    return newPl;
  },

  updatePlaylist(id: string, input: { title?: string; description?: string | null; isPublic?: boolean }): StoredPlaylist | null {
    const playlists = this.getPlaylists();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const current = playlists[idx];
    const updated: StoredPlaylist = {
      ...current,
      title: input.title !== undefined ? input.title.trim() : current.title,
      description: input.description !== undefined ? (input.description?.trim() || undefined) : current.description,
      isPublic: input.isPublic !== undefined ? input.isPublic : current.isPublic,
      updatedAt: new Date().toISOString(),
    };
    playlists[idx] = updated;
    safeSet(PLAYLISTS_KEY, playlists);
    return updated;
  },

  deletePlaylist(id: string): void {
    const playlists = this.getPlaylists().filter((p) => p.id !== id);
    safeSet(PLAYLISTS_KEY, playlists);
    // Borrar pistas asociadas
    const allTracks = this.getAllPlaylistTracks().filter((t) => t.playlistId !== id);
    safeSet(PLAYLIST_TRACKS_KEY, allTracks);
  },

  // ─── PLAYLIST TRACKS ────────────────────────────────
  getAllPlaylistTracks(): StoredPlaylistTrack[] {
    return safeGet<StoredPlaylistTrack[]>(PLAYLIST_TRACKS_KEY, []);
  },

  getPlaylistTracks(playlistId: string): StoredPlaylistTrack[] {
    return this.getAllPlaylistTracks().filter((t) => t.playlistId === playlistId);
  },

  addPlaylistTrack(playlistId: string, trackId: string, trackData?: any): StoredPlaylistTrack {
    const all = this.getAllPlaylistTracks();
    const currentTracks = all.filter((t) => t.playlistId === playlistId);
    const parsed: ApiTrack = trackData?.id ? trackData : {
      id: trackId,
      title: trackData?.title || "Canción",
      artists: trackData?.artists || [{ id: "unknown", name: "Artista desconocido" }],
      durationMs: trackData?.durationMs || 0,
      cover: trackData?.cover,
    };
    const newTrack: StoredPlaylistTrack = {
      id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      playlistId,
      trackId,
      trackData: parsed,
      position: currentTracks.length,
      addedAt: new Date().toISOString(),
    };
    all.push(newTrack);
    safeSet(PLAYLIST_TRACKS_KEY, all);

    // Actualizar updatedAt de la playlist
    this.updatePlaylist(playlistId, {});

    return newTrack;
  },

  addPlaylistTracksBatch(playlistId: string, tracks: any[]): number {
    const all = this.getAllPlaylistTracks();
    const currentTracks = all.filter((t) => t.playlistId === playlistId);
    let position = currentTracks.length;
    let added = 0;

    for (const t of tracks) {
      const trackId = t.id;
      if (!trackId) continue;
      const parsed: ApiTrack = {
        id: trackId,
        title: t.title || "Canción",
        artists: t.artists || [{ id: "unknown", name: "Artista desconocido" }],
        durationMs: t.durationMs || 0,
        cover: t.cover,
      };
      all.push({
        id: `pt_${Date.now()}_${added}_${Math.random().toString(36).slice(2, 6)}`,
        playlistId,
        trackId,
        trackData: parsed,
        position: position++,
        addedAt: new Date().toISOString(),
      });
      added++;
    }

    safeSet(PLAYLIST_TRACKS_KEY, all);
    this.updatePlaylist(playlistId, {});
    return added;
  },

  removePlaylistTrack(playlistId: string, itemIdOrTrackId: string): void {
    const all = this.getAllPlaylistTracks().filter(
      (t) => !(t.playlistId === playlistId && (t.id === itemIdOrTrackId || t.trackId === itemIdOrTrackId))
    );
    safeSet(PLAYLIST_TRACKS_KEY, all);
    this.updatePlaylist(playlistId, {});
  },
};
