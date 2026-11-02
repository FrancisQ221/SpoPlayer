import { md5 } from "./md5";

const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";

// SpoPlayer public Last.fm desktop community keys (or user-supplied)
export const DEFAULT_LASTFM_API_KEY = "9d8e578fa29815c32585973b5037d457";
export const DEFAULT_LASTFM_SHARED_SECRET = "35c60207865c3bb83b06316238b97d26";

export interface LastFmTrackInfo {
  artist: string;
  track: string;
  album?: string;
  durationSec?: number;
  timestampSec?: number;
}

export function generateApiSignature(
  params: Record<string, string>,
  secret: string,
): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== "format" && k !== "callback")
    .sort();

  let signString = "";
  for (const k of sortedKeys) {
    signString += k + params[k];
  }
  signString += secret;
  return md5(signString);
}

export async function updateNowPlaying(
  track: LastFmTrackInfo,
  auth: { apiKey: string; apiSecret: string; sessionKey: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const params: Record<string, string> = {
      method: "track.updateNowPlaying",
      artist: track.artist,
      track: track.track,
      api_key: auth.apiKey,
      sk: auth.sessionKey,
    };
    if (track.album) params.album = track.album;
    if (track.durationSec && track.durationSec > 0) {
      params.duration = String(Math.round(track.durationSec));
    }

    params.api_sig = generateApiSignature(params, auth.apiSecret);
    params.format = "json";

    const body = new URLSearchParams(params);
    const res = await fetch(LASTFM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.message || `Error ${data.error}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Error de red" };
  }
}

export async function scrobbleTrack(
  track: LastFmTrackInfo,
  auth: { apiKey: string; apiSecret: string; sessionKey: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = track.timestampSec || Math.floor(Date.now() / 1000);
    const params: Record<string, string> = {
      method: "track.scrobble",
      artist: track.artist,
      track: track.track,
      timestamp: String(timestamp),
      api_key: auth.apiKey,
      sk: auth.sessionKey,
    };
    if (track.album) params.album = track.album;
    if (track.durationSec && track.durationSec > 0) {
      params.duration = String(Math.round(track.durationSec));
    }

    params.api_sig = generateApiSignature(params, auth.apiSecret);
    params.format = "json";

    const body = new URLSearchParams(params);
    const res = await fetch(LASTFM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.message || `Error ${data.error}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Error de red" };
  }
}
