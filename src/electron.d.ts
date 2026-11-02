import type { SpoPlayerElectronApi } from "../electron/preload";

declare global {
  interface Window {
    spoplayerElectron?: SpoPlayerElectronApi;
  }
}

export {};
