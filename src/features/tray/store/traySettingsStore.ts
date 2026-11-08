import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface TraySettings {
  closeToTray: boolean;
  minimizeToTray: boolean;
  notifyOnTrackChange: boolean;
}

const DEFAULT_SETTINGS: TraySettings = {
  closeToTray: false,
  minimizeToTray: false,
  notifyOnTrackChange: true,
};

function notifyElectron(patch: Partial<TraySettings>) {
  if (typeof window !== "undefined" && window.spoplayerElectron?.trayUpdateSettings) {
    window.spoplayerElectron.trayUpdateSettings(patch);
  }
}

interface TraySettingsState extends TraySettings {
  setCloseToTray: (closeToTray: boolean) => void;
  setMinimizeToTray: (minimizeToTray: boolean) => void;
  setNotifyOnTrackChange: (notifyOnTrackChange: boolean) => void;
  syncFromElectron: (settings: Partial<TraySettings>) => void;
}

export const useTraySettingsStore = create<TraySettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setCloseToTray: (closeToTray) => {
        set({ closeToTray });
        notifyElectron({ closeToTray });
      },
      setMinimizeToTray: (minimizeToTray) => {
        set({ minimizeToTray });
        notifyElectron({ minimizeToTray });
      },
      setNotifyOnTrackChange: (notifyOnTrackChange) => {
        set({ notifyOnTrackChange });
        notifyElectron({ notifyOnTrackChange });
      },
      syncFromElectron: (settings) => {
        set((state) => ({ ...state, ...settings }));
      },
    }),
    {
      name: "spoplayer_tray_settings_v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
