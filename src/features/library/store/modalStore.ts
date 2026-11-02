import { create } from "zustand";
import type { ImportReview } from "@/shared/api";

export interface LibraryItemDetail {
  id: string;
  title: string;
  coverUrl: string;
  type: "album" | "artist" | "playlist";
  subtitle?: string;
  totalTracks?: number;
}

export interface PlaylistOption {
  id: string;
  title: string;
  description?: string;
  coverUrl: string;
  trackCount: number;
}

export interface TrackDetail {
  id: string;
  title: string;
  artists: string;
  coverUrl: string;
  duration?: string;
  durationMs?: number;
  playlists?: PlaylistOption[];
}

export interface RemoveLibraryDetail {
  id: string;
  title: string;
  coverUrl: string;
  type: "album" | "artist" | "playlist";
  subtitle?: string;
  isOwned?: boolean;
}

export interface RemovePlaylistDetail {
  trackId: string;
  playlistItemId?: string;
  trackTitle: string;
  trackArtists: string;
  trackCoverUrl: string;
  playlistId?: string;
  playlistTitle?: string;
}

interface ModalState {
  // Add to library
  addToLibraryOpen: boolean;
  addToLibraryItem: LibraryItemDetail | null;
  openAddToLibrary: (item: LibraryItemDetail) => void;
  closeAddToLibrary: () => void;

  // Add to playlist
  addToPlaylistOpen: boolean;
  addToPlaylistTrack: TrackDetail | null;
  openAddToPlaylist: (track: TrackDetail) => void;
  closeAddToPlaylist: () => void;

  // Create / Import playlist
  createPlaylistOpen: boolean;
  createPlaylistInitialUrl: string;
  createPlaylistPendingTrack: TrackDetail | null;
  createPlaylistInitialTab: "create" | "import";
  openCreatePlaylist: (arg1?: string | TrackDetail | null, pendingTrack?: TrackDetail | null) => void;
  openImportPlaylist: (initialUrl?: string, pendingTrack?: TrackDetail | null) => void;
  closeCreatePlaylist: () => void;

  // Remove from library
  removeFromLibraryOpen: boolean;
  removeFromLibraryDetail: RemoveLibraryDetail | null;
  openRemoveFromLibrary: (detail: RemoveLibraryDetail) => void;
  closeRemoveFromLibrary: () => void;

  // Remove from playlist
  removeFromPlaylistOpen: boolean;
  removeFromPlaylistDetail: RemovePlaylistDetail | null;
  openRemoveFromPlaylist: (detail: RemovePlaylistDetail) => void;
  closeRemoveFromPlaylist: () => void;

  // Import SoundCloud likes
  importLikesOpen: boolean;
  importLikesInitialUsername: string;
  openImportLikes: (initialUsername?: string) => void;
  closeImportLikes: () => void;

  // Import Review / Decisions
  importReviewOpen: boolean;
  importReviewJobId: string | null;
  importReviewPrefetched: ImportReview[] | null;
  importReviewApprovedTracks: any[] | null;
  openImportReview: (jobId: string, prefetchedItems?: ImportReview[], approvedTracks?: any[]) => void;
  closeImportReview: () => void;

  // Search modal / panel
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  // Settings modal
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;

  // Stats modal (Cápsula Musical)
  statsOpen: boolean;
  openStats: () => void;
  closeStats: () => void;
  toggleStats: () => void;

  // Zen Visualizer modal
  zenVisualizerOpen: boolean;
  openZenVisualizer: () => void;
  closeZenVisualizer: () => void;
  toggleZenVisualizer: () => void;

  // Sleep Timer popup/dialog
  sleepTimerOpen: boolean;
  openSleepTimer: () => void;
  closeSleepTimer: () => void;
  toggleSleepTimer: () => void;

  // Equalizer modal
  equalizerOpen: boolean;
  openEqualizer: () => void;
  closeEqualizer: () => void;
  toggleEqualizer: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  addToLibraryOpen: false,
  addToLibraryItem: null,
  openAddToLibrary: (item) =>
    set({ addToLibraryOpen: true, addToLibraryItem: item }),
  closeAddToLibrary: () =>
    set({ addToLibraryOpen: false, addToLibraryItem: null }),

  addToPlaylistOpen: false,
  addToPlaylistTrack: null,
  openAddToPlaylist: (track) =>
    set({ addToPlaylistOpen: true, addToPlaylistTrack: track }),
  closeAddToPlaylist: () =>
    set({ addToPlaylistOpen: false, addToPlaylistTrack: null }),

  createPlaylistOpen: false,
  createPlaylistInitialUrl: "",
  createPlaylistPendingTrack: null,
  createPlaylistInitialTab: "create",
  openCreatePlaylist: (arg1 = null, pendingTrack = null) => {
    let initialUrl = "";
    let track: TrackDetail | null = null;
    if (typeof arg1 === "string") {
      initialUrl = arg1;
      track = pendingTrack;
    } else {
      track = (arg1 as TrackDetail | null) ?? pendingTrack;
    }
    set({
      createPlaylistOpen: true,
      createPlaylistInitialUrl: initialUrl,
      createPlaylistPendingTrack: track,
      createPlaylistInitialTab: "create",
    });
  },
  openImportPlaylist: (initialUrl = "", pendingTrack = null) =>
    set({
      createPlaylistOpen: true,
      createPlaylistInitialUrl: initialUrl,
      createPlaylistPendingTrack: pendingTrack,
      createPlaylistInitialTab: "import",
    }),
  closeCreatePlaylist: () =>
    set({
      createPlaylistOpen: false,
      createPlaylistInitialUrl: "",
      createPlaylistPendingTrack: null,
      createPlaylistInitialTab: "create",
    }),

  removeFromLibraryOpen: false,
  removeFromLibraryDetail: null,
  openRemoveFromLibrary: (detail) =>
    set({ removeFromLibraryOpen: true, removeFromLibraryDetail: detail }),
  closeRemoveFromLibrary: () =>
    set({ removeFromLibraryOpen: false, removeFromLibraryDetail: null }),

  removeFromPlaylistOpen: false,
  removeFromPlaylistDetail: null,
  openRemoveFromPlaylist: (detail) =>
    set({ removeFromPlaylistOpen: true, removeFromPlaylistDetail: detail }),
  closeRemoveFromPlaylist: () =>
    set({ removeFromPlaylistOpen: false, removeFromPlaylistDetail: null }),

  importLikesOpen: false,
  importLikesInitialUsername: "",
  openImportLikes: (initialUsername = "") =>
    set({ importLikesOpen: true, importLikesInitialUsername: initialUsername }),
  closeImportLikes: () =>
    set({ importLikesOpen: false, importLikesInitialUsername: "" }),

  importReviewOpen: false,
  importReviewJobId: null,
  importReviewPrefetched: null,
  importReviewApprovedTracks: null,
  openImportReview: (jobId, prefetchedItems, approvedTracks) =>
    set((state) => ({
      importReviewOpen: true,
      importReviewJobId: jobId,
      importReviewPrefetched: prefetchedItems?.length
        ? prefetchedItems
        : state.importReviewJobId === jobId
          ? state.importReviewPrefetched
          : null,
      importReviewApprovedTracks: approvedTracks?.length
        ? approvedTracks
        : state.importReviewJobId === jobId
          ? state.importReviewApprovedTracks
          : null,
    })),
  closeImportReview: () =>
    set({
      importReviewOpen: false,
    }),

  searchOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),

  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

  statsOpen: false,
  openStats: () => set({ statsOpen: true }),
  closeStats: () => set({ statsOpen: false }),
  toggleStats: () => set((state) => ({ statsOpen: !state.statsOpen })),

  zenVisualizerOpen: false,
  openZenVisualizer: () => set({ zenVisualizerOpen: true }),
  closeZenVisualizer: () => set({ zenVisualizerOpen: false }),
  toggleZenVisualizer: () => set((state) => ({ zenVisualizerOpen: !state.zenVisualizerOpen })),

  sleepTimerOpen: false,
  openSleepTimer: () => set({ sleepTimerOpen: true }),
  closeSleepTimer: () => set({ sleepTimerOpen: false }),
  toggleSleepTimer: () => set((state) => ({ sleepTimerOpen: !state.sleepTimerOpen })),

  equalizerOpen: false,
  openEqualizer: () => set({ equalizerOpen: true }),
  closeEqualizer: () => set({ equalizerOpen: false }),
  toggleEqualizer: () => set((state) => ({ equalizerOpen: !state.equalizerOpen })),
}));
