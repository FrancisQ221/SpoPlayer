import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Track } from "@/shared/types";

export interface PlayRecord {
  trackId: string;
  title: string;
  artist: string;
  coverUrl?: string;
  playedAt: number;
  durationMs: number;
}

export interface StatsState {
  records: PlayRecord[];
  recordPlay: (track: Track, durationMs?: number) => void;
  clearStats: () => void;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      records: [],

      recordPlay: (track: Track, durationMs: number = 30000) => {
        if (!track || !track.id) return;
        const newRecord: PlayRecord = {
          trackId: track.id,
          title: track.title,
          artist: track.artistList?.[0]?.name || track.artists || "Desconocido",
          coverUrl: track.coverUrl,
          playedAt: Date.now(),
          durationMs: Math.max(10000, durationMs),
        };

        set((state) => {
          // Keep up to 2000 most recent records to prevent storage bloating
          const updated = [newRecord, ...state.records].slice(0, 2000);
          return { records: updated };
        });
      },

      clearStats: () => set({ records: [] }),
    }),
    {
      name: "spoplayer_user_stats_v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Computed stats selectors
export function getStatsSummary(records: PlayRecord[]) {
  const totalMs = records.reduce((acc, r) => acc + r.durationMs, 0);
  const totalMinutes = Math.round(totalMs / 60000);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Group by artist
  const artistMap = new Map<string, { count: number; durationMs: number }>();
  // Group by track
  const trackMap = new Map<
    string,
    { title: string; artist: string; coverUrl?: string; count: number }
  >();

  // Time of day counters: [Madrugada (0-6), Mañana (6-12), Tarde (12-18), Noche (18-24)]
  const timeOfDay = [0, 0, 0, 0];

  records.forEach((r) => {
    // Artist
    const curArtist = artistMap.get(r.artist) || { count: 0, durationMs: 0 };
    curArtist.count += 1;
    curArtist.durationMs += r.durationMs;
    artistMap.set(r.artist, curArtist);

    // Track
    const curTrack = trackMap.get(r.trackId) || {
      title: r.title,
      artist: r.artist,
      coverUrl: r.coverUrl,
      count: 0,
    };
    curTrack.count += 1;
    trackMap.set(r.trackId, curTrack);

    // Hour of day
    const hour = new Date(r.playedAt).getHours();
    if (hour >= 0 && hour < 6) timeOfDay[0]++;
    else if (hour >= 6 && hour < 12) timeOfDay[1]++;
    else if (hour >= 12 && hour < 18) timeOfDay[2]++;
    else timeOfDay[3]++;
  });

  // Top 5 Artists
  const topArtists = Array.from(artistMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top Tracks (Obsession)
  const topTracks = Array.from(trackMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topTrack = topTracks[0] || null;

  return {
    totalPlays: records.length,
    totalMinutes,
    totalHours,
    uniqueArtists: artistMap.size,
    topArtists,
    topTracks,
    topTrack,
    timeOfDay,
  };
}
