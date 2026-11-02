import { useEffect, useState } from "react";
import { api, toClientTrack, mediaUrl } from "@/shared/api";
import { localLibrary } from "@/shared/api/localLibraryStorage";
import { queryCache } from "@/shared/cache/queryCache";
import type { Track } from "@/shared/types";
import type { CollectionPageData } from "@/features/collection/hooks/useCollection";
import { useSessionOwner } from "./sessionAwareLoad";

export interface DailyMix {
  id: string;
  title: string;
  description: string;
  clusterArtists: string[];
  coverUrl?: string;
  trackCount: number;
  tracks: Track[];
}

export function getDailyMixArtists(
  clusterArtists?: string[],
  tracks?: Track[],
  targetCount: number = 4,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const addName = (raw?: string) => {
    if (!raw) return;
    const name = raw.trim();
    if (!name || name.toLowerCase() === "unknown" || seen.has(name.toLowerCase())) {
      return;
    }
    seen.add(name.toLowerCase());
    result.push(name);
  };

  if (Array.isArray(clusterArtists)) {
    for (const name of clusterArtists) {
      addName(name);
      if (result.length >= targetCount) return result;
    }
  }

  if (Array.isArray(tracks)) {
    for (const track of tracks) {
      if (track.artistList && track.artistList.length > 0) {
        for (const a of track.artistList) {
          addName(a.name);
          if (result.length >= targetCount) return result;
        }
      } else if (track.artists) {
        const parts = track.artists.split(",").map((p) => p.trim()).filter(Boolean);
        for (const part of parts) {
          addName(part);
          if (result.length >= targetCount) return result;
        }
      }
    }
  }

  return result;
}

// ─── Generación de semilla y mezcla diaria ─────────────────────────────────────

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Rotación determinista con semilla (cambia cada día)
function pseudoRandomSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Temas de respaldo según día de la semana (para usuarios nuevos)
const WEEKDAY_THEMES = [
  // Domingo (0)
  [
    { query: "Chill Vibes Relax", name: "Domingo de Calma" },
    { query: "Top Hits Latino", name: "Éxitos del Fin de Semana" },
    { query: "Acoustic Pop Chill", name: "Sesiones Acústicas" },
    { query: "Lo-Fi Beats Study", name: "Zona Lo-Fi" },
  ],
  // Lunes (1)
  [
    { query: "Energia Motivation Hits", name: "Energía para la Semana" },
    { query: "Top Pop Hits 2024", name: "Éxitos Globales" },
    { query: "Rock Classics Hits", name: "Poder Rock" },
    { query: "Morning Coffee Music", name: "Ritmo de Lunes" },
  ],
  // Martes (2)
  [
    { query: "Latin Urbano Reggaeton", name: "Urbano & Ritmo" },
    { query: "Indie Pop Discovery", name: "Descubrimiento Indie" },
    { query: "Deep Focus Electronic", name: "Enfoque & Beats" },
    { query: "Top 50 Songs", name: "Tendencias del Momento" },
  ],
  // Miércoles (3)
  [
    { query: "Pop En Espanol Exitos", name: "Pop en Tu Idioma" },
    { query: "R&B Soul Chill", name: "Vibras R&B" },
    { query: "Classic Rock Anthems", name: "Himnos del Rock" },
    { query: "Midweek Vibes Mix", name: "Mitad de Semana" },
  ],
  // Jueves (4)
  [
    { query: "Throwback 2000s Hits", name: "Nostalgia 2000s" },
    { query: "Electro Dance Pop", name: "Electro Pop" },
    { query: "Trap Latino Urbano", name: "Trap & Urbano" },
    { query: "Acoustic Covers Hits", name: "Versiones Acústicas" },
  ],
  // Viernes (5)
  [
    { query: "Fiesta Party Hits", name: "Modo Fiesta Viernes" },
    { query: "Top Hits Global 2024", name: "Lo Mejor del Momento" },
    { query: "Reggaeton Duro Hits", name: "Viernes de Perreo" },
    { query: "Electronic Dance Club", name: "Club & Beats" },
  ],
  // Sábado (6)
  [
    { query: "Fin de Semana Party", name: "Sábado en Grande" },
    { query: "Exitos Pop Internacional", name: "Pop Internacional" },
    { query: "Rock En Espanol Clasicos", name: "Rock en Español" },
    { query: "Chill Sunset Beach", name: "Atardecer & Relax" },
  ],
];

// Obtener artistas y canciones favoritas del usuario
async function getUserTasteProfile(): Promise<{ artists: string[]; sampleTrackIds: string[] }> {
  const artistCounts = new Map<string, number>();
  const sampleTrackIds: string[] = [];

  // 1. De los Me Gusta locales
  const likes = localLibrary.getLikes();
  for (const l of likes) {
    if (l.trackId) sampleTrackIds.push(l.trackId);
    const arts = l.trackData?.artists;
    if (Array.isArray(arts)) {
      for (const a of arts) {
        const name = typeof a === "string" ? a : a.name;
        if (name && name !== "Artista desconocido") {
          artistCounts.set(name, (artistCounts.get(name) || 0) + 3); // Más peso a likes
        }
      }
    }
  }

  // 2. Del historial reciente
  try {
    const history = await api.getHistory(undefined, 40);
    for (const h of history.items || []) {
      if (h.track?.id) sampleTrackIds.push(h.track.id);
      const clientTrack = toClientTrack(h.track);
      if (clientTrack.artists) {
        const parts = clientTrack.artists.split(",").map((p) => p.trim()).filter(Boolean);
        for (const p of parts) {
          artistCounts.set(p, (artistCounts.get(p) || 0) + 1);
        }
      }
    }
  } catch {}

  // Ordenar artistas por mayor frecuencia
  const sortedArtists = Array.from(artistCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  return { artists: sortedArtists, sampleTrackIds };
}

async function buildPersonalizedDailyMixes(todayKey: string): Promise<DailyMix[]> {
  const { artists, sampleTrackIds } = await getUserTasteProfile();
  const dayOfWeek = new Date().getDay();
  const daySeed = pseudoRandomSeed(todayKey);
  const weekdayDefaults = WEEKDAY_THEMES[dayOfWeek] || WEEKDAY_THEMES[0];

  const mixes: DailyMix[] = [];
  const targetMixCount = 4;

  for (let i = 0; i < targetMixCount; i++) {
    const mixNumber = i + 1;
    const mixId = `daily-mix-${mixNumber}`;
    let query = "";
    let defaultDesc = "";

    // Si el usuario tiene suficientes artistas favoritos, personalizamos el mix
    if (artists.length > i) {
      const mainArtist = artists[i];
      // Rotamos términos de búsqueda con el artista para dar variedad cada día
      const queryVariations = [
        `${mainArtist} mix`,
        `${mainArtist} radio`,
        `${mainArtist} y similares`,
        `${mainArtist} exitos`,
      ];
      const variationIndex = (daySeed + i) % queryVariations.length;
      query = queryVariations[variationIndex];
      defaultDesc = `Música de ${mainArtist} y artistas similares`;
    } else {
      // Fallback a los temas del día de la semana
      const theme = weekdayDefaults[i] || weekdayDefaults[0];
      query = theme.query;
      defaultDesc = theme.name;
    }

    try {
      const searchRes = await api.search(query, "track");
      let clientTracks = (searchRes.items || [])
        .filter((it) => it.type === "track")
        .slice(0, 20)
        .map((it) => toClientTrack(it));

      // Barajar determinísticamente con la fecha de hoy para que el orden cambie a diario
      if (clientTracks.length > 4) {
        const seedShift = (daySeed + i * 7) % clientTracks.length;
        clientTracks = [...clientTracks.slice(seedShift), ...clientTracks.slice(0, seedShift)];
      }

      if (clientTracks.length > 0) {
        const computedArtists = getDailyMixArtists(undefined, clientTracks, 4);
        const primaryCover = clientTracks[0]?.coverUrl || "";

        const mixItem: DailyMix = {
          id: mixId,
          title: `Daily Mix ${mixNumber}`,
          description: computedArtists.length > 0 ? computedArtists.join(", ") : defaultDesc,
          clusterArtists: computedArtists,
          coverUrl: primaryCover,
          trackCount: clientTracks.length,
          tracks: clientTracks,
        };

        // Cache para abrir instantáneamente en CollectionPage
        const collectionData: CollectionPageData = {
          type: "playlist",
          title: mixItem.title,
          author: computedArtists.length > 0 ? computedArtists.join(", ") : "Daily Mix",
          description: mixItem.description,
          coverUrl: primaryCover,
          tracks: clientTracks,
          isDailyMix: true,
        };
        queryCache.set(`collection:playlist:${mixId}`, collectionData);

        mixes.push(mixItem);
      }
    } catch {}
  }

  return mixes;
}

// ─── Cache con fecha del día ──────────────────────────────────────────────────

const MEM_CACHE: { data: DailyMix[]; dateKey: string; owner: string } = {
  data: [],
  dateKey: "",
  owner: "",
};

function getLocalDailyCache(owner: string, dateKey: string): DailyMix[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`spoplayer:daily-mixes:${dateKey}:${owner}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalDailyCache(owner: string, dateKey: string, mixes: DailyMix[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`spoplayer:daily-mixes:${dateKey}:${owner}`, JSON.stringify(mixes));
  } catch {}
}

export function useDailyMixes() {
  const owner = useSessionOwner() || "local";
  const todayKey = getTodayKey();

  const [data, setData] = useState<DailyMix[]>(() => {
    if (MEM_CACHE.owner === owner && MEM_CACHE.dateKey === todayKey && MEM_CACHE.data.length > 0) {
      return MEM_CACHE.data;
    }
    const saved = getLocalDailyCache(owner, todayKey);
    return saved || [];
  });

  const [isLoading, setIsLoading] = useState(() => data.length === 0);

  useEffect(() => {
    // Si ya tenemos los mixes del día de hoy para este usuario, usamos cache
    if (MEM_CACHE.owner === owner && MEM_CACHE.dateKey === todayKey && MEM_CACHE.data.length > 0) {
      setData(MEM_CACHE.data);
      setIsLoading(false);
      return;
    }

    const saved = getLocalDailyCache(owner, todayKey);
    if (saved && saved.length > 0) {
      MEM_CACHE.data = saved;
      MEM_CACHE.dateKey = todayKey;
      MEM_CACHE.owner = owner;
      setData(saved);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    buildPersonalizedDailyMixes(todayKey)
      .then((mixes) => {
        if (!active) return;
        MEM_CACHE.data = mixes;
        MEM_CACHE.dateKey = todayKey;
        MEM_CACHE.owner = owner;
        setLocalDailyCache(owner, todayKey, mixes);
        setData(mixes);
      })
      .catch(() => {
        if (active) setData([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [owner, todayKey]);

  return { data, isLoading };
}
