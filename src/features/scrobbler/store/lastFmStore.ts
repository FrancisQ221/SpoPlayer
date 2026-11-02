import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";
import {
  DEFAULT_LASTFM_API_KEY,
  DEFAULT_LASTFM_SHARED_SECRET,
} from "../lib/lastFmClient";

interface LastFmState {
  enabled: boolean;
  username: string;
  apiKey: string;
  apiSecret: string;
  sessionKey: string;
  scrobbleThresholdPercent: number; // default 50%
  lastScrobbledTrackId: string | null;
  lastScrobbleStatus: "idle" | "success" | "error";
  lastScrobbleMessage: string | null;

  setEnabled: (enabled: boolean) => void;
  setUsername: (username: string) => void;
  setSessionKey: (sessionKey: string) => void;
  setApiKey: (apiKey: string) => void;
  setApiSecret: (apiSecret: string) => void;
  setThreshold: (percent: number) => void;
  setLastScrobbledTrackId: (id: string | null) => void;
  setLastScrobbleStatus: (status: "idle" | "success" | "error", message?: string | null) => void;
  disconnect: () => void;
}

export const useLastFmStore = create<LastFmState>()(
  persist(
    (set) => ({
      enabled: false,
      username: "",
      apiKey: DEFAULT_LASTFM_API_KEY,
      apiSecret: DEFAULT_LASTFM_SHARED_SECRET,
      sessionKey: "",
      scrobbleThresholdPercent: 50,
      lastScrobbledTrackId: null,
      lastScrobbleStatus: "idle",
      lastScrobbleMessage: null,

      setEnabled: (enabled) => set({ enabled }),
      setUsername: (username) => set({ username }),
      setSessionKey: (sessionKey) => set({ sessionKey, enabled: Boolean(sessionKey) }),
      setApiKey: (apiKey) => set({ apiKey }),
      setApiSecret: (apiSecret) => set({ apiSecret }),
      setThreshold: (percent) => set({ scrobbleThresholdPercent: percent }),
      setLastScrobbledTrackId: (id) => set({ lastScrobbledTrackId: id }),
      setLastScrobbleStatus: (status, message = null) =>
        set({ lastScrobbleStatus: status, lastScrobbleMessage: message }),
      disconnect: () =>
        set({
          enabled: false,
          username: "",
          sessionKey: "",
          lastScrobbledTrackId: null,
          lastScrobbleStatus: "idle",
          lastScrobbleMessage: null,
        }),
    }),
    {
      name: "spoplayer_lastfm",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        username: state.username,
        apiKey: state.apiKey,
        apiSecret: state.apiSecret,
        sessionKey: state.sessionKey,
        scrobbleThresholdPercent: state.scrobbleThresholdPercent,
      }),
    },
  ),
);
