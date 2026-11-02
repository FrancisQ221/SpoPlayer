import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/features/player";
import { useLastFmStore } from "../store/lastFmStore";
import { updateNowPlaying, scrobbleTrack } from "../lib/lastFmClient";

export function useLastFmScrobbler() {
  const enabled = useLastFmStore((s) => s.enabled);
  const sessionKey = useLastFmStore((s) => s.sessionKey);
  const apiKey = useLastFmStore((s) => s.apiKey);
  const apiSecret = useLastFmStore((s) => s.apiSecret);
  const thresholdPct = useLastFmStore((s) => s.scrobbleThresholdPercent);
  const setStatus = useLastFmStore((s) => s.setLastScrobbleStatus);

  const lastTrackIdRef = useRef<string | null>(null);
  const hasNowPlayedRef = useRef<boolean>(false);
  const hasScrobbledRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || !sessionKey) return;

    const unsub = usePlayerStore.subscribe((state) => {
      const track = state.currentTrack;
      if (!track || state.status !== "playing") return;

      const trackId = track.id;
      const durationSec = Math.max(1, (state.durationMs || track.durationMs || 1000) / 1000);
      const positionSec = Math.max(0, state.positionMs / 1000);

      // New track started
      if (trackId !== lastTrackIdRef.current) {
        lastTrackIdRef.current = trackId;
        hasNowPlayedRef.current = false;
        hasScrobbledRef.current = false;
      }

      const auth = { apiKey, apiSecret, sessionKey };
      const artist = track.artists || (track as any).artist || "Unknown Artist";
      const trackName = track.title;
      const album = (track as any).album || undefined;

      // 1. Send Now Playing at start
      if (!hasNowPlayedRef.current && positionSec >= 1) {
        hasNowPlayedRef.current = true;
        void updateNowPlaying(
          { artist, track: trackName, album, durationSec },
          auth,
        ).then((res) => {
          if (!res.success) {
            setStatus("error", res.error);
          }
        });
      }

      // 2. Send Scrobble when reached threshold (default 50% or 4 minutes)
      const thresholdSec = Math.min(240, durationSec * (thresholdPct / 100));
      if (!hasScrobbledRef.current && positionSec >= thresholdSec) {
        hasScrobbledRef.current = true;
        void scrobbleTrack(
          {
            artist,
            track: trackName,
            album,
            durationSec,
            timestampSec: Math.floor(Date.now() / 1000) - Math.floor(positionSec),
          },
          auth,
        ).then((res) => {
          if (res.success) {
            setStatus("success", `Scrobbled: ${trackName}`);
          } else {
            setStatus("error", res.error);
          }
        });
      }
    });

    return unsub;
  }, [enabled, sessionKey, apiKey, apiSecret, thresholdPct, setStatus]);
}
