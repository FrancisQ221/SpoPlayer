import { useEffect } from "react";
import { useTraySettingsStore } from "../store/traySettingsStore";

export function useTraySync(): void {
  useEffect(() => {
    if (!window.spoplayerElectron) return;

    // Fetch initial settings from Electron main process
    window.spoplayerElectron.trayGetSettings?.().then((settings) => {
      if (settings) {
        useTraySettingsStore.getState().syncFromElectron(settings);
      }
    }).catch(() => {});

    // Listen for changes from tray context menu checkboxes
    const cleanup = window.spoplayerElectron.onTraySettingsChanged?.((settings) => {
      useTraySettingsStore.getState().syncFromElectron(settings);
    });

    return cleanup;
  }, []);
}
