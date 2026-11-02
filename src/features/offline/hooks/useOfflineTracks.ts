import { useState, useEffect, useCallback } from "react";
import { offlineManager } from "../services/offlineManager";
import { useOfflineStore } from "../store/offlineStore";
import type { Track } from "@/shared/types";

export function useOfflineTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const downloadedIds = useOfflineStore((s) => s.downloadedTrackIds);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await offlineManager.getAllDownloadedTracks();
      setTracks(data.tracks);
      setTotalBytes(data.totalBytes);
    } catch {
      setTracks([]);
      setTotalBytes(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [downloadedIds, refresh]);

  return {
    tracks,
    totalBytes,
    isLoading,
    refresh,
  };
}
