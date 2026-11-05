import { Tray, Menu, nativeImage, app, Notification, ipcMain, type BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";

export interface TraySettings {
  closeToTray: boolean;
  minimizeToTray: boolean;
  notifyOnTrackChange: boolean;
  hasSeenTrayNotice?: boolean;
}

const DEFAULT_SETTINGS: TraySettings = {
  closeToTray: true,
  minimizeToTray: false,
  notifyOnTrackChange: true,
  hasSeenTrayNotice: false,
};

function loadTraySettings(userDataPath: string): TraySettings {
  try {
    const file = path.join(userDataPath, "tray-settings.json");
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      return {
        closeToTray: typeof data.closeToTray === "boolean" ? data.closeToTray : DEFAULT_SETTINGS.closeToTray,
        minimizeToTray: typeof data.minimizeToTray === "boolean" ? data.minimizeToTray : DEFAULT_SETTINGS.minimizeToTray,
        notifyOnTrackChange: typeof data.notifyOnTrackChange === "boolean" ? data.notifyOnTrackChange : DEFAULT_SETTINGS.notifyOnTrackChange,
        hasSeenTrayNotice: typeof data.hasSeenTrayNotice === "boolean" ? data.hasSeenTrayNotice : DEFAULT_SETTINGS.hasSeenTrayNotice,
      };
    }
  } catch (err) {
    console.warn("[tray] Failed to read tray settings file:", err);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveTraySettings(userDataPath: string, settings: TraySettings): void {
  try {
    const file = path.join(userDataPath, "tray-settings.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(settings, null, 2), "utf8");
  } catch (err) {
    console.warn("[tray] Failed to write tray settings file:", err);
  }
}

export class TrayManager {
  private tray: Tray | null = null;
  private currentTrackTitle = "";
  private currentTrackArtist = "";
  private isPlaying = false;
  private lastNotifiedTrackId = "";
  private iconPath = "";
  private notifIconPath = "";
  private settings: TraySettings;
  private userDataPath: string;

  constructor(
    private readonly getMainWindow: () => BrowserWindow | null,
    private readonly sendAction: (action: string, payload?: any) => void,
    private readonly toggleOverlay: () => void,
    private readonly onQuit: () => void,
  ) {
    this.userDataPath = app.getPath("userData");
    this.settings = loadTraySettings(this.userDataPath);
    this.registerIpcHandlers();
  }

  private registerIpcHandlers(): void {
    ipcMain.handle("tray:get-settings", () => ({ ...this.settings }));

    ipcMain.on("tray:update-settings", (_event, patch: Partial<TraySettings>) => {
      this.updateSettings(patch);
    });
  }

  public getSettings(): TraySettings {
    return { ...this.settings };
  }

  public isCloseToTray(): boolean {
    return this.settings.closeToTray;
  }

  public isMinimizeToTray(): boolean {
    return this.settings.minimizeToTray;
  }

  public updateSettings(patch: Partial<TraySettings>): void {
    this.settings = { ...this.settings, ...patch };
    saveTraySettings(this.userDataPath, this.settings);
    this.updateMenu();

    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("tray:settings-changed", this.settings);
    }
  }

  public notifyFirstClose(): void {
    if (this.settings.hasSeenTrayNotice) return;
    this.settings.hasSeenTrayNotice = true;
    saveTraySettings(this.userDataPath, this.settings);

    if (!Notification.isSupported()) return;
    try {
      const notif = new Notification({
        title: "SpoPlayer activo en segundo plano",
        body: "La música continuará reproduciéndose. Haz clic aquí o en el icono de la bandeja para volver a abrir la ventana.",
        icon: this.notifIconPath || this.iconPath || undefined,
        silent: true,
      });
      notif.on("click", () => {
        const win = this.getMainWindow();
        if (!win || win.isDestroyed()) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      });
      notif.show();
    } catch (err) {
      console.warn("[tray] Failed to show first close notice:", err);
    }
  }

  private showTrackNotification(title: string, artist: string): void {
    if (!Notification.isSupported()) return;
    try {
      const notif = new Notification({
        title: title || "SpoPlayer",
        body: artist ? `${artist} • SpoPlayer` : "Reproduciendo en SpoPlayer",
        icon: this.notifIconPath || this.iconPath || undefined,
        silent: true,
      });
      notif.on("click", () => {
        const win = this.getMainWindow();
        if (!win || win.isDestroyed()) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      });
      notif.show();
    } catch (err) {
      console.warn("[tray] Failed to show track notification:", err);
    }
  }

  init(): void {
    if (this.tray) return;

    const isWin = process.platform === "win32";
    const appPath = app.getAppPath();
    const candidatePaths = [
      path.join(appPath, "build", isWin ? "icon.ico" : "icon.png"),
      path.join(appPath, "public", "icon.png"),
      path.join(process.cwd(), "build", isWin ? "icon.ico" : "icon.png"),
      path.join(process.cwd(), "public", "icon.png"),
    ];

    this.iconPath = candidatePaths.find((p) => fs.existsSync(p)) || "";

    const pngCandidates = [
      path.join(appPath, "public", "icon.png"),
      path.join(process.cwd(), "public", "icon.png"),
      this.iconPath,
    ];
    this.notifIconPath = pngCandidates.find((p) => p && fs.existsSync(p)) || "";

    let trayIcon = this.iconPath ? nativeImage.createFromPath(this.iconPath) : nativeImage.createEmpty();
    if (!trayIcon.isEmpty() && isWin) {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createFromBuffer(Buffer.alloc(16 * 16 * 4, 255));
    }

    try {
      this.tray = new Tray(trayIcon);
      this.tray.setToolTip("SpoPlayer");

      this.updateMenu();

      this.tray.on("click", () => {
        const win = this.getMainWindow();
        if (!win || win.isDestroyed()) return;

        // If the window is currently visible, un-minimized, and focused: hide it.
        // Otherwise, restore, bring to front, and focus.
        // This prevents the jarring double-click glitch where single-click toggles back and forth.
        if (win.isVisible() && !win.isMinimized() && win.isFocused()) {
          win.hide();
        } else {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        }
        this.updateMenu();
      });

      this.tray.on("double-click", () => {
        const win = this.getMainWindow();
        if (!win || win.isDestroyed()) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        this.updateMenu();
      });
    } catch (err) {
      console.warn("[tray] Failed to initialize system tray:", err);
    }
  }

  updateState(state: { status?: string; track?: any }): void {
    const wasPlaying = this.isPlaying;
    this.isPlaying = state?.status === "playing";
    this.currentTrackTitle = state?.track?.title || "";
    this.currentTrackArtist = state?.track?.artist || state?.track?.artists || "";

    const trackId = state?.track?.id || (this.currentTrackTitle ? `${this.currentTrackTitle}-${this.currentTrackArtist}` : "");

    // Track change notification when window is hidden or minimized
    if (
      this.settings.notifyOnTrackChange &&
      this.isPlaying &&
      trackId &&
      trackId !== this.lastNotifiedTrackId
    ) {
      this.lastNotifiedTrackId = trackId;
      const win = this.getMainWindow();
      const isHidden = !win || win.isDestroyed() || !win.isVisible() || win.isMinimized();
      if (isHidden) {
        this.showTrackNotification(this.currentTrackTitle, this.currentTrackArtist);
      }
    } else if (!this.isPlaying && !wasPlaying) {
      // Keep trackId in sync
      if (trackId) this.lastNotifiedTrackId = trackId;
    }

    if (this.tray) {
      const tooltip = this.currentTrackTitle
        ? `SpoPlayer: ${this.currentTrackTitle}${this.currentTrackArtist ? ` - ${this.currentTrackArtist}` : ""}`
        : "SpoPlayer";
      this.tray.setToolTip(tooltip.slice(0, 127));
      this.updateMenu();
    }
  }

  updateMenu(): void {
    if (!this.tray) return;
    const win = this.getMainWindow();
    const isWinVisible = win && !win.isDestroyed() ? win.isVisible() && !win.isMinimized() : false;

    const trackLabel = this.currentTrackTitle
      ? `🎵 ${this.currentTrackTitle}${this.currentTrackArtist ? ` — ${this.currentTrackArtist}` : ""}`
      : "🎵 Sin reproducción activa";

    const contextMenu = Menu.buildFromTemplate([
      {
        label: trackLabel.length > 46 ? `${trackLabel.slice(0, 43)}...` : trackLabel,
        enabled: Boolean(this.currentTrackTitle),
        click: () => {
          const w = this.getMainWindow();
          if (!w || w.isDestroyed()) return;
          if (w.isMinimized()) w.restore();
          w.show();
          w.focus();
        },
      },
      { type: "separator" },
      {
        label: isWinVisible ? "Ocultar SpoPlayer" : "Mostrar SpoPlayer",
        click: () => {
          const w = this.getMainWindow();
          if (!w || w.isDestroyed()) return;
          if (w.isVisible() && !w.isMinimized()) {
            w.hide();
          } else {
            if (w.isMinimized()) w.restore();
            w.show();
            w.focus();
          }
          this.updateMenu();
        },
      },
      { type: "separator" },
      {
        label: this.isPlaying ? "⏸️  Pausar" : "▶️  Reproducir",
        click: () => this.sendAction("togglePlay"),
      },
      {
        label: "⏭️  Siguiente canción",
        click: () => this.sendAction("next"),
      },
      {
        label: "⏮️  Pista anterior",
        click: () => this.sendAction("prev"),
      },
      { type: "separator" },
      {
        label: "🎛️  Widget flotante (MiniPlayer)",
        click: () => this.toggleOverlay(),
      },
      {
        label: "⚙️  Configuración",
        click: () => {
          const w = this.getMainWindow();
          if (w && !w.isDestroyed()) {
            if (w.isMinimized()) w.restore();
            w.show();
            w.focus();
          }
          this.sendAction("openSettings");
        },
      },
      { type: "separator" },
      {
        label: "Opciones de la bandeja",
        submenu: [
          {
            label: "Minimizar a la bandeja al cerrar (X)",
            type: "checkbox",
            checked: this.settings.closeToTray,
            click: (item) => {
              this.updateSettings({ closeToTray: item.checked });
            },
          },
          {
            label: "Minimizar a la bandeja al minimizar (-)",
            type: "checkbox",
            checked: this.settings.minimizeToTray,
            click: (item) => {
              this.updateSettings({ minimizeToTray: item.checked });
            },
          },
          {
            label: "Notificaciones de canción",
            type: "checkbox",
            checked: this.settings.notifyOnTrackChange,
            click: (item) => {
              this.updateSettings({ notifyOnTrackChange: item.checked });
            },
          },
        ],
      },
      { type: "separator" },
      {
        label: "❌  Salir de SpoPlayer",
        click: () => this.onQuit(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  destroy(): void {
    try {
      ipcMain.removeHandler("tray:get-settings");
      ipcMain.removeAllListeners("tray:update-settings");
    } catch {}

    if (this.tray) {
      try {
        this.tray.destroy();
      } catch {}
      this.tray = null;
    }
  }
}
