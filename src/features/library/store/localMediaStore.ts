import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Track } from "@/shared/types";
import { showToast } from "@/shared/ui";

export interface LocalMediaState {
  folders: string[];
  tracks: Track[];
  isScanning: boolean;
  lastScannedAt: number | null;
  searchQuery: string;

  init: () => Promise<void>;
  scan: () => Promise<void>;
  addFolder: () => Promise<void>;
  removeFolder: (folder: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  openFileInFolder: (filePath: string) => Promise<void>;
}

export const useLocalMediaStore = create<LocalMediaState>()(
  persist(
    (set, get) => ({
      folders: [],
      tracks: [],
      isScanning: false,
      lastScannedAt: null,
      searchQuery: "",

      init: async () => {
        const electron = (window as any).spoplayer;
        if (!electron?.scanLocalMusic) return;

        let currentFolders = get().folders;
        if (!currentFolders || currentFolders.length === 0) {
          try {
            const defaults = await electron.getDefaultMusicFolders?.();
            if (Array.isArray(defaults) && defaults.length > 0) {
              currentFolders = defaults;
              set({ folders: defaults });
            }
          } catch {}
        }

        if (get().tracks.length === 0 && currentFolders.length > 0) {
          void get().scan();
        }
      },

      scan: async () => {
        const electron = (window as any).spoplayer;
        if (!electron?.scanLocalMusic) return;

        const folders = get().folders;
        set({ isScanning: true });

        try {
          const rawTracks = await electron.scanLocalMusic(folders);
          const formattedTracks: Track[] = (rawTracks || []).map((t: any) => ({
            id: t.id,
            title: t.title || "Pista local",
            artists: t.artists || "Artista local",
            coverUrl: t.coverUrl || "",
            durationMs: t.durationMs || 180000,
            playCount: 0,
            releaseDate: t.year,
            album: {
              id: `local-album:${encodeURIComponent(t.album || "local")}`,
              title: t.album || "Álbum local",
            },
          }));

          set({
            tracks: formattedTracks,
            isScanning: false,
            lastScannedAt: Date.now(),
          });

          if (formattedTracks.length > 0) {
            showToast(
              `Colección local actualizada`,
              "checkmark",
              {
                description: `${formattedTracks.length} canciones encontradas`,
              },
            );
          }
        } catch (err: any) {
          set({ isScanning: false });
          showToast("Error al escanear música local", "error", {
            description: err?.message || String(err),
          });
        }
      },

      addFolder: async () => {
        const electron = (window as any).spoplayer;
        if (!electron?.pickMusicFolder) return;

        try {
          const chosen = await electron.pickMusicFolder();
          if (!chosen) return;

          const existing = get().folders;
          if (existing.includes(chosen)) {
            showToast("La carpeta ya está en tu biblioteca", "info");
            return;
          }

          const updated = [...existing, chosen];
          set({ folders: updated });
          await get().scan();
        } catch (err: any) {
          showToast("No se pudo agregar la carpeta", "error", {
            description: err?.message,
          });
        }
      },

      removeFolder: async (folder: string) => {
        const remaining = get().folders.filter((f) => f !== folder);
        set({ folders: remaining });
        await get().scan();
      },

      setSearchQuery: (searchQuery: string) => set({ searchQuery }),

      openFileInFolder: async (filePath: string) => {
        const electron = (window as any).spoplayer;
        if (!electron?.openLocalFileInFolder) return;
        try {
          await electron.openLocalFileInFolder(filePath);
        } catch {}
      },
    }),
    {
      name: "spoplayer_local_media_store_v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        folders: state.folders,
        lastScannedAt: state.lastScannedAt,
      }),
    },
  ),
);
