import { useEffect, useState } from "react";
import { api, toClientTrack, mediaUrl } from "@/shared/api";
import type { Track } from "@/shared/types";

export type PopularTrackItem = Track;

export interface PopularAlbumItem {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  totalTracks: number;
  albumType: string;
  explicit?: boolean;
}

export interface PopularArtistItem {
  id: string;
  name: string;
  imageUrl: string;
  followers: number;
  description: string;
  totalListens: number;
  totalTracks: number;
}

export interface PopularPlaylistItem {
  id: string;
  title: string;
  owner: string;
  coverUrl: string;
  totalTracks: number;
}

export type PopularItem =
  | { type: "track"; item: PopularTrackItem; playCount: number }
  | { type: "album"; item: PopularAlbumItem; playCount: number }
  | { type: "artist"; item: PopularArtistItem; playCount: number }
  | { type: "playlist"; item: PopularPlaylistItem; playCount: number };

export const popularTracksKeys = {
  all: ["popular"] as const,
  onlyTracks: ["popularTracks"] as const,
};

export const popularTracksAllTimeKeys = {
  allTime: ["popularTracksAllTime"] as const,
};

const cache = new Map<string, { data: PopularItem[]; timestamp: number }>();
const CACHE_TTL = 900_000; // 15 minutos de cache en memoria

// Fallback search para canciones populares usando Innertube / YouTube Music
async function fetchTrendingTracks(query: string, limit = 20): Promise<PopularItem[]> {
  try {
    const searchRes = await api.search(query, "track");
    const tracks = (searchRes.items || [])
      .filter((it) => it.type === "track")
      .slice(0, limit)
      .map((it, idx) => ({
        type: "track" as const,
        item: toClientTrack(it),
        playCount: Math.max(10, 1000 - idx * 25),
      }));
    return tracks;
  } catch {
    return [];
  }
}

export function usePopularTracksOnly(limit = 20) {
  const [data, setData] = useState<PopularItem[]>(() => cache.get(`tracks_7d_${limit}`)?.data ?? []);
  const [isLoading, setIsLoading] = useState(!cache.has(`tracks_7d_${limit}`));

  useEffect(() => {
    const cached = cache.get(`tracks_7d_${limit}`);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    api
      .getPopularTracks("7d", limit)
      .then((res) => {
        if (!active) return;
        if (res.items && res.items.length > 0) {
          const items: PopularItem[] = res.items.map((entry) => ({
            type: "track",
            item: toClientTrack(entry.track),
            playCount: entry.playCount,
          }));
          cache.set(`tracks_7d_${limit}`, { data: items, timestamp: Date.now() });
          setData(items);
        } else {
          // Fallback a tendencias de catÃ¡logo
          fetchTrendingTracks("Top Hits 2024", limit).then((fallback) => {
            if (!active) return;
            cache.set(`tracks_7d_${limit}`, { data: fallback, timestamp: Date.now() });
            setData(fallback);
          });
        }
      })
      .catch(() => {
        if (!active) return;
        fetchTrendingTracks("Top Hits 2024", limit).then((fallback) => {
          if (!active) return;
          cache.set(`tracks_7d_${limit}`, { data: fallback, timestamp: Date.now() });
          setData(fallback);
        });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [limit]);

  return { data, isLoading };
}

export function usePopularTracksAllTime(limit = 20) {
  const [data, setData] = useState<PopularItem[]>(() => cache.get(`tracks_all_${limit}`)?.data ?? []);
  const [isLoading, setIsLoading] = useState(!cache.has(`tracks_all_${limit}`));

  useEffect(() => {
    const cached = cache.get(`tracks_all_${limit}`);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    api
      .getPopularTracks("all", limit)
      .then((res) => {
        if (!active) return;
        if (res.items && res.items.length > 0) {
          const items: PopularItem[] = res.items.map((entry) => ({
            type: "track",
            item: toClientTrack(entry.track),
            playCount: entry.playCount,
          }));
          cache.set(`tracks_all_${limit}`, { data: items, timestamp: Date.now() });
          setData(items);
        } else {
          fetchTrendingTracks("Grandes Exitos Musica", limit).then((fallback) => {
            if (!active) return;
            cache.set(`tracks_all_${limit}`, { data: fallback, timestamp: Date.now() });
            setData(fallback);
          });
        }
      })
      .catch(() => {
        if (!active) return;
        fetchTrendingTracks("Grandes Exitos Musica", limit).then((fallback) => {
          if (!active) return;
          cache.set(`tracks_all_${limit}`, { data: fallback, timestamp: Date.now() });
          setData(fallback);
        });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [limit]);

  return { data, isLoading };
}

export function usePopular(limit = 50) {
  const [data, setData] = useState<PopularItem[]>(() => cache.get(`popular_${limit}`)?.data ?? []);
  const [isLoading, setIsLoading] = useState(!cache.has(`popular_${limit}`));

  useEffect(() => {
    const cached = cache.get(`popular_${limit}`);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    // Buscar Ã¡lbumes y playlists populares de catÃ¡logo
    Promise.allSettled([
      api.search("Top Albums 2024", "album"),
      api.search("Top Hits Playlist", "playlist"),
    ]).then(([albumsRes, playlistsRes]) => {
      if (!active) return;
      const items: PopularItem[] = [];

      if (albumsRes.status === "fulfilled" && albumsRes.value.items) {
        for (const it of albumsRes.value.items) {
          if (it.type === "album") {
            const album = it as any;
            items.push({
              type: "album",
              item: {
                id: album.id,
                title: album.title,
                artist: Array.isArray(album.artists) ? album.artists[0]?.name || "Artista" : (album.artist || "Artista"),
                coverUrl: album.cover?.url ? mediaUrl(album.cover.url) : "",
                totalTracks: album.trackCount || 0,
                albumType: "album",
                explicit: album.explicit,
              },
              playCount: 500,
            });
          }
        }
      }

      if (playlistsRes.status === "fulfilled" && playlistsRes.value.items) {
        for (const it of playlistsRes.value.items) {
          if (it.type === "playlist") {
            const pl = it as any;
            items.push({
              type: "playlist",
              item: {
                id: pl.id,
                title: pl.title,
                owner: pl.owner?.displayName || pl.owner?.username || "SpoPlayer",
                coverUrl: pl.cover?.url ? mediaUrl(pl.cover.url) : "",
                totalTracks: pl.trackCount || 0,
              },
              playCount: 400,
            });
          }
        }
      }

      cache.set(`popular_${limit}`, { data: items, timestamp: Date.now() });
      setData(items);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [limit]);

  return { data, isLoading };
}
