import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Returns true if the application is currently running inside Tauri WebView.
 */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

/**
 * Compatibility Bridge: Exposes `window.spoplayerElectron` using Tauri APIs
 * when running under Tauri. This allows 100% of the existing React UI, stores,
 * and components to function seamlessly without rewriting them.
 */
export function initTauriBridge(): void {
  if (typeof window === "undefined") return;
  if (!isTauri()) return;
  if ((window as any).spoplayerElectron) return;

  const appWindow = getCurrentWindow();

  (window as any).spoplayerElectron = {
    platform: "win32",
    isWindows: true,
    isLinux: false,
    isMacOS: false,
    isHyprland: false,

    // Window controls
    minimize: async () => {
      try {
        await appWindow.minimize();
      } catch (err) {
        console.warn("[TauriBridge] minimize error:", err);
      }
    },
    toggleMaximize: async () => {
      try {
        await appWindow.toggleMaximize();
      } catch (err) {
        console.warn("[TauriBridge] toggleMaximize error:", err);
      }
    },
    toggleFullScreen: async () => {
      try {
        const isFs = await appWindow.isFullscreen();
        await appWindow.setFullscreen(!isFs);
      } catch (err) {
        console.warn("[TauriBridge] toggleFullScreen error:", err);
      }
    },
    close: async () => {
      try {
        await appWindow.close();
      } catch (err) {
        console.warn("[TauriBridge] close error:", err);
      }
    },
    isMaximized: async () => {
      try {
        return await appWindow.isMaximized();
      } catch {
        return false;
      }
    },
    isFullScreen: async () => {
      try {
        return await appWindow.isFullscreen();
      } catch {
        return false;
      }
    },

    // Window dragging (frameless window drag)
    dragStart: async () => {
      try {
        await appWindow.startDragging();
      } catch (err) {
        console.warn("[TauriBridge] startDragging error:", err);
      }
    },
    dragMove: () => {},
    dragEnd: () => {},

    // Window state change listener
    onWindowStateChange: (cb: (state: { isMaximized: boolean; isFullScreen: boolean }) => void) => {
      let isCleanedUp = false;
      let unlistenFn: (() => void) | null = null;

      const setup = async () => {
        try {
          const unlisten = await appWindow.onResized(async () => {
            if (isCleanedUp) return;
            const isMax = await appWindow.isMaximized();
            const isFs = await appWindow.isFullscreen();
            cb({ isMaximized: isMax, isFullScreen: isFs });
          });
          if (isCleanedUp) {
            unlisten();
          } else {
            unlistenFn = unlisten;
          }
        } catch {}
      };

      void setup();

      return () => {
        isCleanedUp = true;
        if (unlistenFn) unlistenFn();
      };
    },
    onWindowRestored: () => () => {},
    onWindowMinimized: () => () => {},

    // System Tray settings compatibility
    trayGetSettings: async () => ({
      closeToTray: false,
      minimizeToTray: false,
      notifyOnTrackChange: true,
    }),
    trayUpdateSettings: () => {},
    onTraySettingsChanged: () => () => {},

    // Safe fallbacks for optional desktop extras
    discordUpdateState: () => {},
    discordUpdateSettings: () => {},
    getDiscordStatus: async () => ({ isConnected: false }),
    openDownloads: () => {},
    openExportFolder: () => {},
    diagnoseNetwork: async () => ({}),
  };

  console.info("[TauriBridge] Successfully initialized spoplayerElectron bridge for Tauri 2.0");
}
