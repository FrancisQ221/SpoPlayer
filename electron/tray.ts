import { Tray, Menu, nativeImage, app, type BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";

export class TrayManager {
  private tray: Tray | null = null;
  private currentTrackTitle = "";
  private currentTrackArtist = "";
  private isPlaying = false;

  constructor(
    private readonly getMainWindow: () => BrowserWindow | null,
    private readonly sendAction: (action: string) => void,
    private readonly toggleOverlay: () => void,
    private readonly onQuit: () => void,
  ) {}

  init() {
    if (this.tray) return;

    const isWin = process.platform === "win32";
    const appPath = app.getAppPath();
    const candidatePaths = [
      path.join(appPath, "build", isWin ? "icon.ico" : "icon.png"),
      path.join(appPath, "public", "icon.png"),
      path.join(process.cwd(), "build", isWin ? "icon.ico" : "icon.png"),
      path.join(process.cwd(), "public", "icon.png"),
    ];

    const iconPath = candidatePaths.find((p) => fs.existsSync(p));
    let trayIcon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createFromBuffer(Buffer.alloc(16 * 16 * 4, 255));
    }

    try {
      this.tray = new Tray(trayIcon);
      this.tray.setToolTip("SpoPlayer");

      this.updateMenu();

      this.tray.on("click", () => {
        const win = this.getMainWindow();
        if (!win) return;
        if (win.isVisible() && !win.isMinimized()) {
          win.hide();
        } else {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        }
      });

      this.tray.on("double-click", () => {
        const win = this.getMainWindow();
        if (!win) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      });
    } catch (err) {
      console.warn("[tray] Failed to initialize system tray:", err);
    }
  }

  updateState(state: { status?: string; track?: any }) {
    this.isPlaying = state?.status === "playing";
    this.currentTrackTitle = state?.track?.title || "";
    this.currentTrackArtist = state?.track?.artist || state?.track?.artists || "";
    if (this.tray) {
      const tooltip = this.currentTrackTitle
        ? `SpoPlayer: ${this.currentTrackTitle} - ${this.currentTrackArtist}`
        : "SpoPlayer";
      this.tray.setToolTip(tooltip.slice(0, 127));
      this.updateMenu();
    }
  }

  updateMenu() {
    if (!this.tray) return;
    const win = this.getMainWindow();
    const isWinVisible = win ? win.isVisible() : false;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: this.currentTrackTitle
          ? `🎵 ${this.currentTrackTitle}`
          : "SpoPlayer",
        enabled: false,
      },
      { type: "separator" },
      {
        label: isWinVisible ? "Ocultar SpoPlayer" : "Mostrar SpoPlayer",
        click: () => {
          const w = this.getMainWindow();
          if (!w) return;
          if (w.isVisible()) {
            w.hide();
          } else {
            if (w.isMinimized()) w.restore();
            w.show();
            w.focus();
          }
        },
      },
      { type: "separator" },
      {
        label: this.isPlaying ? "Pausar" : "Reproducir",
        click: () => this.sendAction("togglePlay"),
      },
      {
        label: "Siguiente canción",
        click: () => this.sendAction("next"),
      },
      {
        label: "Pista anterior",
        click: () => this.sendAction("prev"),
      },
      { type: "separator" },
      {
        label: "Widget Flotante (MiniPlayer)",
        click: () => this.toggleOverlay(),
      },
      { type: "separator" },
      {
        label: "Salir de SpoPlayer",
        click: () => this.onQuit(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
