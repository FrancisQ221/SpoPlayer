import { supabase } from "./supabase";
import type {
  ApiUserPlaylist,
  ApiUserPlaylistItem,
  ApiLikedTracksPage,
  ApiTrack,
  ApiTrackBase,
} from "./api";
import type {
  PublicUser,
  UpdateProfileInput,
} from "@/shared/contracts";
import {
  setAuthSession,
  clearAuthSession,
  type AuthTokens,
  type AuthUser,
} from "./auth-session";
import { localLibrary } from "./localLibraryStorage";

function mapSupabaseUser(user: any): PublicUser {
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email,
    username: metadata.username || user.email?.split("@")[0] || "user",
    displayName: metadata.displayName || metadata.display_name || metadata.full_name || user.email?.split("@")[0] || "Usuario",
    avatarUrl: metadata.avatar_url || null,
    bio: metadata.bio || null,
    isPublic: true,
    showActivity: true,
    showHistory: true,
    showLikedTracks: true,
    participateLeaderboards: false,
  };
}

function sessionToAuthTokens(session: any): AuthTokens {
  const user = mapSupabaseUser(session.user);
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    accessTokenExpiresAt: new Date((session.expires_at || 0) * 1000).toISOString(),
    expiresAt: (session.expires_at || 0) * 1000,
    user,
  };
}

export const supabaseBackend = {
  isAvailable(): boolean {
    return Boolean(supabase);
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.session) {
      throw new Error(error?.message || "Error al iniciar sesión");
    }
    const tokens = sessionToAuthTokens(data.session);
    setAuthSession(tokens);
    return tokens;
  },

  async register(
    email: string,
    password: string,
    username: string,
    displayName: string,
  ): Promise<AuthTokens> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
          displayName: cleanDisplayName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      const loginAttempt = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (loginAttempt.data.session) {
        const tokens = sessionToAuthTokens(loginAttempt.data.session);
        setAuthSession(tokens);
        return tokens;
      }
      const dummyUser: PublicUser = {
        id: data.user?.id || crypto.randomUUID(),
        email: cleanEmail,
        username: cleanUsername,
        displayName: cleanDisplayName,
      };
      const dummyTokens: AuthTokens = {
        accessToken: "pending",
        refreshToken: "pending",
        accessTokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        user: dummyUser,
      };
      setAuthSession(dummyTokens);
      return dummyTokens;
    }

    const tokens = sessionToAuthTokens(data.session);
    setAuthSession(tokens);
    return tokens;
  },

  async getMe(): Promise<AuthUser> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error(error?.message || "No autenticado");
    }
    return mapSupabaseUser(data.user);
  },

  async updateProfile(patch: UpdateProfileInput): Promise<PublicUser> {
    const updates: Record<string, unknown> = {};
    if (patch.displayName !== undefined) updates.displayName = patch.displayName;
    if (patch.username !== undefined) updates.username = patch.username;
    if (patch.avatarUrl !== undefined) updates.avatar_url = patch.avatarUrl;
    if (patch.bio !== undefined) updates.bio = patch.bio;

    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });
    if (error || !data.user) {
      throw new Error(error?.message || "Error al actualizar perfil");
    }
    return mapSupabaseUser(data.user);
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    await clearAuthSession();
  },

  // ── Playlists ─────────────────────────────────────────────────────────────

  async listPlaylists(): Promise<{ items: ApiUserPlaylist[] }> {
    const localItems = localLibrary.getPlaylists().map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      isPublic: Boolean(p.isPublic),
      revision: 1,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      ownerId: "local_user",
      owner: {
        id: "local_user",
        displayName: "Tú",
        username: "local",
      },
    }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { items: localItems };

      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !data) {
        return { items: localItems };
      }

      const remoteItems: ApiUserPlaylist[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        isPublic: Boolean(row.is_public),
        revision: row.revision || 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ownerId: row.user_id,
        owner: {
          id: row.user_id,
          displayName: user.user_metadata?.displayName || "Usuario",
          username: user.user_metadata?.username || "user",
        },
      }));

      // Combinar sin duplicados por ID
      const remoteIds = new Set(remoteItems.map((r) => r.id));
      const combined = [...remoteItems, ...localItems.filter((l) => !remoteIds.has(l.id))];
      return { items: combined };
    } catch {
      return { items: localItems };
    }
  },

  async getUserPlaylist(
    id: string,
  ): Promise<{ playlist: ApiUserPlaylist; items: ApiUserPlaylistItem[] }> {
    // 1. Intentar buscar en Supabase si es un UUID
    try {
      const { data: row } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", id)
        .single();

      if (row) {
        const playlist: ApiUserPlaylist = {
          id: row.id,
          title: row.title,
          description: row.description || undefined,
          isPublic: Boolean(row.is_public),
          revision: row.revision || 1,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          ownerId: row.user_id,
        };

        const { data: trackRows } = await supabase
          .from("playlist_tracks")
          .select("*")
          .eq("playlist_id", id)
          .order("position", { ascending: true });

        const items: ApiUserPlaylistItem[] = (trackRows || []).map((t: any) => ({
          id: t.id,
          track: t.track_data && t.track_data.id ? t.track_data : {
            id: t.track_id,
            title: t.track_data?.title || "Canción",
            artists: t.track_data?.artists || [{ id: "unknown", name: "Artista desconocido" }],
            durationMs: t.track_data?.durationMs || 0,
            cover: t.track_data?.cover,
          },
          position: t.position,
          addedAt: t.added_at,
        }));

        return { playlist, items };
      }
    } catch {}

    // 2. Buscar en almacenamiento local
    const local = localLibrary.getPlaylist(id);
    if (local) {
      const localTracks = localLibrary.getPlaylistTracks(id);
      const playlist: ApiUserPlaylist = {
        id: local.id,
        title: local.title,
        description: local.description,
        isPublic: Boolean(local.isPublic),
        revision: 1,
        createdAt: local.createdAt,
        updatedAt: local.updatedAt,
        ownerId: "local_user",
        owner: { id: "local_user", displayName: "Tú", username: "local" },
      };
      const items: ApiUserPlaylistItem[] = localTracks.map((t) => ({
        id: t.id,
        track: t.trackData,
        position: t.position,
        addedAt: t.addedAt,
      }));
      return { playlist, items };
    }

    throw new Error("Playlist no encontrada");
  },

  async createPlaylist(input: {
    title: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<ApiUserPlaylist> {
    // Siempre guardar en almacenamiento local de inmediato
    const local = localLibrary.createPlaylist(input);
    const result: ApiUserPlaylist = {
      id: local.id,
      title: local.title,
      description: local.description,
      isPublic: Boolean(local.isPublic),
      revision: 1,
      createdAt: local.createdAt,
      updatedAt: local.updatedAt,
      ownerId: "local_user",
      owner: { id: "local_user", displayName: "Tú", username: "local" },
    };

    // Si hay sesión en Supabase, además guardar en Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("playlists")
          .insert({
            id: local.id,
            user_id: user.id,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            is_public: Boolean(input.isPublic),
            revision: 1,
            created_at: local.createdAt,
            updated_at: local.updatedAt,
          })
          .select()
          .single();

        if (data) {
          result.ownerId = user.id;
          result.owner = {
            id: user.id,
            displayName: user.user_metadata?.displayName || "Usuario",
            username: user.user_metadata?.username || "user",
          };
        }
      }
    } catch {}

    return result;
  },

  async updatePlaylist(
    id: string,
    input: { title?: string; description?: string | null; isPublic?: boolean },
  ): Promise<ApiUserPlaylist> {
    localLibrary.updatePlaylist(id, input);

    try {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.description !== undefined) patch.description = input.description?.trim() || null;
      if (input.isPublic !== undefined) patch.is_public = input.isPublic;

      await supabase.from("playlists").update(patch).eq("id", id);
    } catch {}

    const updated = localLibrary.getPlaylist(id);
    return {
      id,
      title: updated?.title || input.title || "Playlist",
      description: updated?.description || undefined,
      isPublic: Boolean(updated?.isPublic),
      revision: 1,
      createdAt: updated?.createdAt || new Date().toISOString(),
      updatedAt: updated?.updatedAt || new Date().toISOString(),
    };
  },

  async deletePlaylist(id: string): Promise<void> {
    localLibrary.deletePlaylist(id);
    try {
      await supabase.from("playlists").delete().eq("id", id);
    } catch {}
  },

  async addPlaylistTrack(
    playlistId: string,
    trackId: string,
    snapshot?: any,
  ): Promise<ApiUserPlaylistItem> {
    const localItem = localLibrary.addPlaylistTrack(playlistId, trackId, snapshot);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("playlist_tracks").insert({
          id: localItem.id,
          playlist_id: playlistId,
          track_id: trackId,
          track_data: localItem.trackData,
          position: localItem.position,
          added_at: localItem.addedAt,
        });
      }
    } catch {}

    return {
      id: localItem.id,
      track: localItem.trackData,
      position: localItem.position,
      addedAt: localItem.addedAt,
    };
  },

  async addPlaylistTrackSnapshots(
    playlistId: string,
    tracks: ApiTrackBase[],
  ): Promise<{ items: ApiUserPlaylistItem[]; added: number; rejected: number }> {
    const addedCount = localLibrary.addPlaylistTracksBatch(playlistId, tracks);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const rows = tracks.map((t, idx) => ({
          playlist_id: playlistId,
          track_id: t.id,
          track_data: t,
          position: idx,
          added_at: new Date().toISOString(),
        }));
        await supabase.from("playlist_tracks").insert(rows);
      }
    } catch {}

    const allLocal = localLibrary.getPlaylistTracks(playlistId);
    const items: ApiUserPlaylistItem[] = allLocal.map((t) => ({
      id: t.id,
      track: t.trackData,
      position: t.position,
      addedAt: t.addedAt,
    }));

    return { items, added: addedCount, rejected: tracks.length - addedCount };
  },

  async removePlaylistTrack(playlistId: string, itemId: string): Promise<void> {
    localLibrary.removePlaylistTrack(playlistId, itemId);
    try {
      await supabase
        .from("playlist_tracks")
        .delete()
        .match({ playlist_id: playlistId, id: itemId });
    } catch {}
  },

  // ── "Mis Me Gustas" (Likes) ────────────────────────────────────────────────

  async listLikedTracks(limit = 100, _cursor?: string): Promise<ApiLikedTracksPage> {
    const localLikes = localLibrary.getLikes().map((l) => ({
      track: {
        ...l.trackData,
        viewer: { liked: true },
      },
      likedAt: l.createdAt,
    }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { items: localLikes.slice(0, limit), nextCursor: null };
      }

      const { data, error } = await supabase
        .from("likes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error || !data) {
        return { items: localLikes.slice(0, limit), nextCursor: null };
      }

      const remoteItems = data.map((row: any) => {
        const parsedTrack: ApiTrack = row.track_data && row.track_data.id ? row.track_data : {
          id: row.track_id,
          title: row.track_data?.title || "Canción",
          artists: row.track_data?.artists || [{ id: "unknown", name: "Artista desconocido" }],
          durationMs: row.track_data?.durationMs || 0,
          cover: row.track_data?.cover,
        };
        return {
          track: { ...parsedTrack, viewer: { liked: true } },
          likedAt: row.created_at,
        };
      });

      // Unir sin duplicados (remotos primero)
      const seen = new Set(remoteItems.map((r) => r.track.id));
      const combined = [...remoteItems, ...localLikes.filter((l) => !seen.has(l.track.id))];

      return { items: combined.slice(0, limit), nextCursor: null };
    } catch {
      return { items: localLikes.slice(0, limit), nextCursor: null };
    }
  },

  async likeTrack(id: string, snapshot?: any): Promise<void> {
    // 1. Guardar localmente siempre (inmediato, sin fallar nunca)
    localLibrary.likeTrack(id, snapshot);

    // 2. Si hay usuario autenticado en Supabase, guardar en la nube
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const trackData = snapshot || {
          id,
          title: "Canción",
          artists: [{ id: "unknown", name: "Artista" }],
          durationMs: 0,
        };
        await supabase
          .from("likes")
          .upsert({
            user_id: user.id,
            track_id: id,
            track_data: trackData,
            created_at: new Date().toISOString(),
          }, { onConflict: "user_id,track_id" });
      }
    } catch {}
  },

  async unlikeTrack(id: string): Promise<void> {
    // 1. Borrar localmente siempre
    localLibrary.unlikeTrack(id);

    // 2. Si hay usuario autenticado en Supabase, borrar de la nube
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("likes")
          .delete()
          .match({ user_id: user.id, track_id: id });
      }
    } catch {}
  },
};

if (typeof window !== "undefined") {
  supabase
    .channel("spoplayer-cloud-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "playlists" },
      () => {
        window.dispatchEvent(new Event("library:changed"));
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "playlist_tracks" },
      () => {
        window.dispatchEvent(new Event("library:changed"));
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "likes" },
      () => {
        window.dispatchEvent(new Event("library:changed"));
      },
    )
    .subscribe();
}
