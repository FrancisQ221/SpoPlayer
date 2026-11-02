import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useTheme } from "next-themes";
import { debouncedStorage } from "@/shared/utils/storage";

export interface BlockCustomization {
  opacity: number;
  blur: number;
  dim: number;
}

export interface CustomizationState {
  backgroundImage: string | null;
  backgroundBlur: number;
  backgroundDim: number;
  dynamicAccent: boolean;
  wallpaperAccentColor: string | null;
  sidebar: BlockCustomization;
  contentView: BlockCustomization;
  miniplayer: BlockCustomization;

  setBackgroundImage: (image: string | null) => void;
  setBackgroundBlur: (blur: number) => void;
  setBackgroundDim: (dim: number) => void;
  setDynamicAccent: (enabled: boolean) => void;
  setWallpaperAccentColor: (color: string | null) => void;
  setBlockConfig: (
    block: "sidebar" | "contentView" | "miniplayer",
    patch: Partial<BlockCustomization>,
  ) => void;
  applyToAllBlocks: (sourceBlock: "sidebar" | "contentView" | "miniplayer") => void;
  resetBlock: (block: "sidebar" | "contentView" | "miniplayer") => void;
  resetAll: () => void;
}

export const MIN_OPACITY = 25;
export const MAX_OPACITY = 100;
export const MIN_BLUR = 10;
export const MAX_BLUR = 40;
export const MIN_DIM = 8;
export const MAX_DIM = 85;

export const DEFAULT_BLOCK_CONFIG: BlockCustomization = {
  opacity: 100,
  blur: 0,
  dim: 0,
};

export const DEFAULT_GLASS_CONFIG: BlockCustomization = {
  opacity: 60,
  blur: 20,
  dim: 15,
};

const DB_NAME = "spoplayer_customization_db";
const STORE_NAME = "wallpapers";
const BG_KEY = "active_wallpaper";

// opens simple indexeddb instance for wallpaper storage
function openWallpaperDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadPersistedWallpaper(): Promise<string | null> {
  const db = await openWallpaperDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(BG_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// saves wallpaper payload to indexeddb
async function savePersistedWallpaper(data: string | null): Promise<void> {
  const db = await openWallpaperDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = data ? store.put(data, BG_KEY) : store.delete(BG_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export const clampBlockConfig = (cfg: Partial<BlockCustomization>): BlockCustomization => {
  const opacity = typeof cfg.opacity === "number"
    ? Math.max(MIN_OPACITY, Math.min(MAX_OPACITY, Math.round(cfg.opacity)))
    : DEFAULT_BLOCK_CONFIG.opacity;

  const blur = typeof cfg.blur === "number"
    ? Math.max(MIN_BLUR, Math.min(MAX_BLUR, Math.round(cfg.blur)))
    : DEFAULT_BLOCK_CONFIG.blur;

  const dim = typeof cfg.dim === "number"
    ? Math.max(MIN_DIM, Math.min(MAX_DIM, Math.round(cfg.dim)))
    : DEFAULT_BLOCK_CONFIG.dim;

  return { opacity, blur, dim };
};

export const wallpaperBroadcast =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("spoplayer_wallpaper_sync")
    : null;

if (wallpaperBroadcast) {
  wallpaperBroadcast.onmessage = (e) => {
    if (e.data?.type === "wallpaper_changed") {
      useCustomizationStore.setState({ backgroundImage: e.data.image });
    } else if (e.data?.type === "dynamic_accent_changed") {
      useCustomizationStore.setState({ dynamicAccent: e.data.enabled });
    } else if (e.data?.type === "wallpaper_accent_changed") {
      useCustomizationStore.setState({ wallpaperAccentColor: e.data.color });
    } else if (e.data?.type === "request_wallpaper") {
      const current = useCustomizationStore.getState().backgroundImage;
      const currentDynamic = useCustomizationStore.getState().dynamicAccent;
      const currentAccent = useCustomizationStore.getState().wallpaperAccentColor;
      if (current) {
        wallpaperBroadcast.postMessage({ type: "wallpaper_changed", image: current });
      }
      wallpaperBroadcast.postMessage({ type: "dynamic_accent_changed", enabled: currentDynamic });
      wallpaperBroadcast.postMessage({ type: "wallpaper_accent_changed", color: currentAccent });
    }
  };
}

export const useCustomizationStore = create<CustomizationState>()(
  persist(
    (set, get) => ({
      backgroundImage: null,
      backgroundBlur: 0,
      backgroundDim: 0,
      dynamicAccent: true,
      wallpaperAccentColor: null,
      sidebar: { ...DEFAULT_BLOCK_CONFIG },
      contentView: { ...DEFAULT_BLOCK_CONFIG },
      miniplayer: { ...DEFAULT_BLOCK_CONFIG },

      setBackgroundImage: (image) => {
        set({
          backgroundImage: image,
          ...(image ? {} : { wallpaperAccentColor: null }),
        });
        void savePersistedWallpaper(image);
        wallpaperBroadcast?.postMessage({ type: "wallpaper_changed", image });
        if (!image) {
          wallpaperBroadcast?.postMessage({ type: "wallpaper_accent_changed", color: null });
        }

        if (image) {
          // Always keep sidebar solid, while giving the content area and player glass transparency
          set({
            contentView: { opacity: 35, blur: 12, dim: 15 },
            sidebar: { opacity: 100, blur: 0, dim: 0 },
            miniplayer: { ...DEFAULT_GLASS_CONFIG },
          });
        } else if (!image) {
          set({
            backgroundBlur: 0,
            backgroundDim: 0,
            wallpaperAccentColor: null,
            sidebar: { ...DEFAULT_BLOCK_CONFIG },
            contentView: { ...DEFAULT_BLOCK_CONFIG },
            miniplayer: { ...DEFAULT_BLOCK_CONFIG },
          });
        }
      },

      setBackgroundBlur: (blur) => {
        const clamped = Math.max(0, Math.min(40, Math.round(blur)));
        set({ backgroundBlur: clamped });
      },

      setBackgroundDim: (dim) => {
        const clamped = Math.max(0, Math.min(85, Math.round(dim)));
        set({ backgroundDim: clamped });
      },

      setDynamicAccent: (enabled) => {
        set({ dynamicAccent: enabled });
        wallpaperBroadcast?.postMessage({
          type: "dynamic_accent_changed",
          enabled,
        });
      },

      setWallpaperAccentColor: (color) => {
        set({ wallpaperAccentColor: color });
        wallpaperBroadcast?.postMessage({
          type: "wallpaper_accent_changed",
          color,
        });
      },

      setBlockConfig: (block, patch) => {
        set((state) => ({
          [block]: {
            ...state[block],
            ...clampBlockConfig({
              ...state[block],
              ...patch,
            }),
          },
        }));
      },

      applyToAllBlocks: (sourceBlock) => {
        const src = get()[sourceBlock];
        const cloned = { ...src };
        set({
          sidebar: { ...cloned },
          contentView: { ...cloned },
          miniplayer: { ...cloned },
        });
      },

      resetBlock: (block) => {
        set((state) => ({
          [block]: state.backgroundImage
            ? { ...DEFAULT_GLASS_CONFIG }
            : { ...DEFAULT_BLOCK_CONFIG },
        }));
      },

      resetAll: () => {
        void savePersistedWallpaper(null);
        wallpaperBroadcast?.postMessage({ type: "wallpaper_changed", image: null });
        wallpaperBroadcast?.postMessage({ type: "wallpaper_accent_changed", color: null });
        set({
          backgroundImage: null,
          backgroundBlur: 0,
          backgroundDim: 0,
          dynamicAccent: true,
          wallpaperAccentColor: null,
          sidebar: { ...DEFAULT_BLOCK_CONFIG },
          contentView: { ...DEFAULT_BLOCK_CONFIG },
          miniplayer: { ...DEFAULT_BLOCK_CONFIG },
        });
      },
    }),
    {
      name: "spoplayer_customization_v1",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (state) => ({
        backgroundBlur: state.backgroundBlur,
        backgroundDim: state.backgroundDim,
        dynamicAccent: state.dynamicAccent,
        wallpaperAccentColor: state.wallpaperAccentColor,
        sidebar: state.sidebar,
        contentView: state.contentView,
        miniplayer: state.miniplayer,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.sidebar = clampBlockConfig(state.sidebar || {});
        state.contentView = clampBlockConfig(state.contentView || {});
        state.miniplayer = clampBlockConfig(state.miniplayer || {});
        void loadPersistedWallpaper().then((img) => {
          if (img) {
            useCustomizationStore.setState({ backgroundImage: img });
          }
        });
        wallpaperBroadcast?.postMessage({ type: "request_wallpaper" });
      },
    },
  ),
);

function getIsDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

export function useIsContentTransparent(): boolean {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme ? resolvedTheme === "dark" : getIsDarkTheme();
  const backgroundImage = useCustomizationStore((s) => s.backgroundImage);
  return Boolean(isDark && backgroundImage);
}

export function getBlockStyle(
  config: BlockCustomization,
  isDark: boolean,
  hasCustomBg: boolean,
): React.CSSProperties {
  if (!hasCustomBg || !isDark) {
    return {};
  }

  if (config.opacity === 100 && config.blur === 0 && config.dim === 0) {
    return {
      background: "var(--color-bg-primary, #0a0a0a)",
      ["--glass-pill-border" as any]: "none",
    };
  }

  const alpha = config.opacity / 100;
  const dimAlpha = config.dim / 100;
  const baseRgb = "10, 10, 10";

  let bg: string;
  if (dimAlpha > 0) {
    bg = `linear-gradient(rgba(0, 0, 0, ${dimAlpha}), rgba(0, 0, 0, ${dimAlpha})), rgba(${baseRgb}, ${alpha})`;
  } else {
    bg = `rgba(${baseRgb}, ${alpha})`;
  }

  const t = (100 - config.opacity) / 75;

  const glassPillBg = `linear-gradient(135deg, rgba(0, 0, 0, ${(0.55 - 0.35 * t).toFixed(3)}) 0%, rgba(0, 0, 0, ${(0.45 - 0.30 * t).toFixed(3)}) 100%)`;
  const glassPillBgHover = `linear-gradient(135deg, rgba(0, 0, 0, ${(0.70 - 0.35 * t).toFixed(3)}) 0%, rgba(0, 0, 0, ${(0.58 - 0.32 * t).toFixed(3)}) 100%)`;
  const glassPillBorder = "none";

  const glassBlur = `${Math.round(8 + 16 * t)}px`;
  const glassProminentBg = `rgba(255, 255, 255, ${(1 - 0.18 * t).toFixed(2)})`;

  return {
    background: bg,
    backdropFilter: config.blur > 0 ? `blur(${config.blur}px)` : "blur(12px)",
    WebkitBackdropFilter: config.blur > 0 ? `blur(${config.blur}px)` : "blur(12px)",
    ["--glass-pill-bg" as any]: glassPillBg,
    ["--glass-pill-bg-hover" as any]: glassPillBgHover,
    ["--glass-pill-border" as any]: glassPillBorder,
    ["--glass-blur" as any]: glassBlur,
    ["--glass-prominent-bg" as any]: glassProminentBg,
  };
}

// checks if custom wallpaper is set and at least one interface block has transparent blur
export function isGlassThemeActive(state: {
  backgroundImage: string | null;
  sidebar: BlockCustomization;
  contentView: BlockCustomization;
  miniplayer: BlockCustomization;
}): boolean {
  if (!state.backgroundImage) return false;
  return [state.sidebar, state.contentView, state.miniplayer].some(
    (b) => b.opacity < 100 && b.blur > 0,
  );
}

export const selectIsGlassThemeActive = (state: CustomizationState): boolean =>
  isGlassThemeActive(state);
