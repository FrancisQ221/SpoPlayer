import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";

export interface ActiveDownload {
  trackId: string;
  title: string;
  artists?: string;
  progress: number;
  status: "downloading" | "completed" | "error";
  error?: string;
}

interface OfflineState {
  downloadedTrackIds: string[];
  activeDownloads: Record<string, ActiveDownload>;
  isDownloaded: (trackId?: string) => boolean;
  isDownloading: (trackId?: string) => boolean;
  getDownloadProgress: (trackId?: string) => number;
  markDownloaded: (trackId: string) => void;
  markRemoved: (trackId: string) => void;
  setDownloadProgress: (trackId: string, progress: number, title?: string, artists?: string) => void;
  setDownloadCompleted: (trackId: string) => void;
  setDownloadError: (trackId: string, error: string) => void;
  clearAll: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      downloadedTrackIds: [],
      activeDownloads: {},

      isDownloaded: (trackId) => {
        if (!trackId) return false;
        return get().downloadedTrackIds.includes(trackId);
      },

      isDownloading: (trackId) => {
        if (!trackId) return false;
        const task = get().activeDownloads[trackId];
        return task?.status === "downloading";
      },

      getDownloadProgress: (trackId) => {
        if (!trackId) return 0;
        return get().activeDownloads[trackId]?.progress ?? 0;
      },

      markDownloaded: (trackId) => {
        set((state) => {
          const ids = state.downloadedTrackIds.includes(trackId)
            ? state.downloadedTrackIds
            : [...state.downloadedTrackIds, trackId];
          const newActive = { ...state.activeDownloads };
          delete newActive[trackId];
          return { downloadedTrackIds: ids, activeDownloads: newActive };
        });
      },

      markRemoved: (trackId) => {
        set((state) => {
          const newActive = { ...state.activeDownloads };
          delete newActive[trackId];
          return {
            downloadedTrackIds: state.downloadedTrackIds.filter((id) => id !== trackId),
            activeDownloads: newActive,
          };
        });
      },

      setDownloadProgress: (trackId, progress, title = "", artists = "") => {
        set((state) => ({
          activeDownloads: {
            ...state.activeDownloads,
            [trackId]: {
              trackId,
              title: title || state.activeDownloads[trackId]?.title || trackId,
              artists: artists || state.activeDownloads[trackId]?.artists,
              progress,
              status: "downloading",
            },
          },
        }));
      },

      setDownloadCompleted: (trackId) => {
        get().markDownloaded(trackId);
      },

      setDownloadError: (trackId, error) => {
        set((state) => ({
          activeDownloads: {
            ...state.activeDownloads,
            [trackId]: {
              ...(state.activeDownloads[trackId] || { trackId, title: trackId, progress: 0 }),
              status: "error",
              error,
            },
          },
        }));
      },

      clearAll: () => {
        set({ downloadedTrackIds: [], activeDownloads: {} });
      },
    }),
    {
      name: "spoplayer_offline_v1",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (state) => ({
        downloadedTrackIds: state.downloadedTrackIds,
      }),
    },
  ),
);
