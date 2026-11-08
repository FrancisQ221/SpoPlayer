import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

/**
 * Returns true if the application is running inside a Tauri WebView.
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "__TAURI_INTERNALS__" in window ||
    "__TAURI__" in window ||
    navigator.userAgent.includes("Tauri")
  );
}

function setupNativeFetchInterceptor(): void {
  if (typeof window === "undefined") return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url: string;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input && typeof (input as Request).url === "string") {
      url = (input as Request).url;
    } else {
      url = String(input);
    }

    // Route YouTube Music & Apple Music requests through native Rust to bypass CORS and set Origin headers
    const isSpecialTarget =
      url.includes("youtube.com") ||
      url.includes("googlevideo.com") ||
      url.includes("music.apple.com");

    if (!isSpecialTarget) {
      return originalFetch(input, init);
    }

    try {
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      const headers: Record<string, string> = {};

      const inputHeaders = init?.headers || (input instanceof Request ? input.headers : undefined);
      if (inputHeaders) {
        if (inputHeaders instanceof Headers) {
          inputHeaders.forEach((v, k) => {
            headers[k] = v;
          });
        } else if (Array.isArray(inputHeaders)) {
          for (const [k, v] of inputHeaders) {
            headers[k] = v;
          }
        } else {
          Object.assign(headers, inputHeaders);
        }
      }

      let bodyStr: string | undefined;
      const rawBody = init?.body;
      if (rawBody) {
        if (typeof rawBody === "string") {
          bodyStr = rawBody;
        } else if (rawBody instanceof URLSearchParams) {
          bodyStr = rawBody.toString();
        }
      }

      const res: {
        status: number;
        status_text: string;
        headers: Record<string, string>;
        body: string;
      } = await invoke("native_fetch", {
        url,
        method,
        headers,
        body: bodyStr,
      });

      const responseHeaders = new Headers();
      for (const [k, v] of Object.entries(res.headers)) {
        responseHeaders.set(k, v);
      }

      return new Response(res.body, {
        status: res.status,
        statusText: res.status_text,
        headers: responseHeaders,
      });
    } catch (err) {
      console.warn("[TauriBridge] Native fetch failed, falling back to original fetch:", err);
      return originalFetch(input, init);
    }
  };
}

/**
 * Compatibility Bridge: Exposes `window.spoplayerElectron` using Tauri APIs
 * with an infallible Proxy fallback so that ANY Electron call made by React
 * components or hooks runs seamlessly without throwing undefined errors.
 */
export function initTauriBridge(): void {
  if (typeof window === "undefined") return;
  // If Electron already provided its native preload bridge, do not overwrite
  if ((window as any).spoplayerElectron && !isTauri()) return;

  setupNativeFetchInterceptor();

  let appWindow: any = null;
  try {
    appWindow = getCurrentWindow();
  } catch (err) {
    console.warn("[TauriBridge] Could not get current window:", err);
  }

  const explicitHandlers: Record<string, any> = {
    platform: "win32",
    isWindows: true,
    isLinux: false,
    isMacOS: false,
    isHyprland: false,

    // Window controls
    minimize: async () => {
      try {
        await appWindow?.minimize();
      } catch (err) {
        console.warn("[TauriBridge] minimize error:", err);
      }
    },
    toggleMaximize: async () => {
      try {
        await appWindow?.toggleMaximize();
      } catch (err) {
        console.warn("[TauriBridge] toggleMaximize error:", err);
      }
    },
    toggleFullScreen: async () => {
      try {
        const isFs = await appWindow?.isFullscreen();
        await appWindow?.setFullscreen(!isFs);
      } catch (err) {
        console.warn("[TauriBridge] toggleFullScreen error:", err);
      }
    },
    close: async () => {
      try {
        await appWindow?.close();
      } catch (err) {
        console.warn("[TauriBridge] close error:", err);
      }
    },
    isMaximized: async () => {
      try {
        return (await appWindow?.isMaximized()) ?? false;
      } catch {
        return false;
      }
    },
    isFullScreen: async () => {
      try {
        return (await appWindow?.isFullscreen()) ?? false;
      } catch {
        return false;
      }
    },

    // Window dragging (frameless window drag)
    dragStart: async () => {
      try {
        await appWindow?.startDragging();
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
          if (!appWindow) return;
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

    // Discord status fallback
    discordUpdateState: () => {},
    discordUpdateSettings: () => {},
    getDiscordStatus: async () => ({ isConnected: false, connected: false }),

    // Network / cache fallbacks
    diagnoseNetwork: async () => ({}),
    getCacheStats: async () => ({
      cacheSize: 0,
      httpCacheSize: 0,
      codeCacheSize: 0,
      serviceWorkerSize: 0,
      indexedDbSize: 0,
      localStorageSize: 0,
      blobStorageSize: 0,
      cachePath: "",
    }),
    openCacheFolder: async () => false,
    clearCoversCache: async () => true,
    clearAudioCache: async () => true,
    clearHttpCache: async () => true,
    openDownloads: async () => false,
    openExportFolder: async () => false,
    saveDump: async () => ({ success: false }),

    // Server time & security
    syncServerTime: async () => Date.now(),
    getServerTimeOffset: async () => 0,
    mintPoToken: async () => "",
    signCoverUrl: async (payload: string) => payload,
    signRawPayload: async () => "",
    signMonitorRequest: async () => ({}),

    // App icons & updates
    setAppIcon: async () => {},
    getAppVersion: async () => "0.1.42",
    checkForUpdates: async () => ({ available: false }),
    downloadUpdate: async () => ({ success: false }),
    quitAndInstall: async () => false,

    // OTA Frontend Bundle Updater fallbacks
    bundleCheck: async () => ({ available: false }),
    bundleDownloadAndInstall: async () => ({ success: false }),
    bundleHotSwap: async () => false,
    bundleRollback: async () => false,
    bundleGetStatus: async () => ({
      appVersion: "0.1.42",
      bundleVersion: "0.1.42",
      isOta: false,
      sha256: null,
      effectivePath: "",
    }),

    // Explicitly undefined so auth-session.ts uses localStorage directly
    authSession: undefined,
  };

  // Safe Proxy that intercepts ANY unhandled call and returns a benign no-op
  const bridgeProxy = new Proxy(explicitHandlers, {
    get(target, prop: string | symbol) {
      if (typeof prop === "symbol") return (target as any)[prop];
      if (prop in target) return target[prop];

      // Any event listener `onXxx(...)` returns an unlisten function
      if (prop.startsWith("on")) {
        return () => () => {};
      }

      // Any boolean getter `isXxx(...)` returns false
      if (prop.startsWith("is")) {
        return async () => false;
      }

      // Any data getter `getXxx(...)` returns null
      if (prop.startsWith("get")) {
        return async () => null;
      }

      // Any generic method call returns resolved promise / no-op
      return async () => {};
    },
  });

  (window as any).spoplayerElectron = bridgeProxy;
  console.info("[TauriBridge] Successfully initialized foolproof spoplayerElectron bridge for Tauri 2.0");
}
