import { resolvePlaybackStream } from "@/features/player/engine/streamResolver";
import { downloadAudioBytes } from "@/shared/media/innertube";
import { spoplayerDb, audioCache } from "@/shared/storage";
import { useOfflineStore } from "../store/offlineStore";
import { api } from "@/shared/api";
import { showToast } from "@/shared/ui";
import type { Track } from "@/shared/types";

export class OfflineManager {
  private inFlightDownloads = new Map<string, AbortController>();

  async isTrackDownloaded(trackId: string): Promise<boolean> {
    if (!trackId) return false;
    const storeKnown = useOfflineStore.getState().isDownloaded(trackId);
    if (storeKnown) return true;
    const hasAudio = await spoplayerDb.hasAudio(trackId);
    if (hasAudio) {
      useOfflineStore.getState().markDownloaded(trackId);
      return true;
    }
    return false;
  }

  async downloadTrack(track: Track, silent: boolean = false): Promise<boolean> {
    if (!track || !track.id) return false;

    if (await this.isTrackDownloaded(track.id)) {
      if (!silent) {
        showToast("Canción ya descargada", "info", {
          description: `${track.title} — ${track.artists}`,
        });
      }
      return true;
    }

    if (this.inFlightDownloads.has(track.id)) {
      return false;
    }

    const abortController = new AbortController();
    this.inFlightDownloads.set(track.id, abortController);
    useOfflineStore.getState().setDownloadProgress(track.id, 10, track.title, track.artists);

    try {
      // 1. Resolve playback stream
      const stream = await resolvePlaybackStream(track, abortController.signal);
      useOfflineStore.getState().setDownloadProgress(track.id, 35, track.title, track.artists);

      // 2. Download audio bytes
      let blob: Blob | null = null;
      if (stream.blob) {
        blob = stream.blob;
      } else {
        const bytes = await downloadAudioBytes(stream.url, {
          contentLength: stream.contentLength,
          signal: abortController.signal,
        });
        if (!bytes || abortController.signal.aborted) {
          throw new Error("No bytes received");
        }
        const mimeType = stream.mimeType || "audio/webm";
        blob = new Blob([bytes], { type: mimeType });
      }

      useOfflineStore.getState().setDownloadProgress(track.id, 75, track.title, track.artists);

      // 3. Save into spoplayerDb via audioCache
      await audioCache.saveAudioBlob(track.id, blob, blob.type);
      await spoplayerDb.putTrack(track);

      // 4. Prefetch lyrics in background
      void (async () => {
        try {
          const gen = api.streamLyrics(track.id, undefined, {
            title: track.title,
            artist: track.artists,
            durationMs: track.durationMs,
          });
          for await (const _ of gen) {
            // let streamLyrics cache them into spoplayerDb
          }
        } catch {}
      })();

      useOfflineStore.getState().markDownloaded(track.id);

      if (!silent) {
        showToast("Descarga completada", "checkmark", {
          description: `${track.title} — ${track.artists}`,
        });
      }
      return true;
    } catch (err: any) {
      if (abortController.signal.aborted) {
        useOfflineStore.getState().markRemoved(track.id);
        return false;
      }
      const message = err?.message || "Error al descargar";
      useOfflineStore.getState().setDownloadError(track.id, message);
      if (!silent) {
        showToast("Error en la descarga", "error", {
          description: `${track.title}: ${message}`,
        });
      }
      return false;
    } finally {
      this.inFlightDownloads.delete(track.id);
    }
  }

  cancelDownload(trackId: string): void {
    const controller = this.inFlightDownloads.get(trackId);
    if (controller) {
      controller.abort();
      this.inFlightDownloads.delete(trackId);
    }
    useOfflineStore.getState().markRemoved(trackId);
  }

  async removeDownload(trackId: string): Promise<void> {
    this.cancelDownload(trackId);
    await audioCache.deleteAudio(trackId);
    useOfflineStore.getState().markRemoved(trackId);
    showToast("Descarga eliminada", "info");
  }

  async downloadPlaylist(playlistTitle: string, tracks: Track[]): Promise<void> {
    if (!tracks || tracks.length === 0) return;

    const unDownloaded = tracks.filter((t) => !useOfflineStore.getState().isDownloaded(t.id));
    if (unDownloaded.length === 0) {
      showToast("Todas las canciones ya están descargadas", "info", {
        description: playlistTitle,
      });
      return;
    }

    showToast(`Descargando lista (${unDownloaded.length} canciones)`, "info", {
      description: playlistTitle,
    });

    let completed = 0;
    for (const track of unDownloaded) {
      await this.downloadTrack(track, true);
      completed++;
    }

    showToast(`Lista descargada (${completed} canciones)`, "checkmark", {
      description: playlistTitle,
    });
  }

  async removePlaylistDownloads(tracks: Track[]): Promise<void> {
    for (const track of tracks) {
      await this.removeDownload(track.id);
    }
    showToast("Descargas de la lista eliminadas", "info");
  }

  async getAllDownloadedTracks(): Promise<{ tracks: Track[]; totalBytes: number }> {
    const audioRecords = await spoplayerDb.getAllAudioRecords();
    const cachedTracks = await spoplayerDb.getAllTracks();
    const trackMap = new Map<string, Track>();

    for (const ct of cachedTracks) {
      trackMap.set(ct.id, {
        id: ct.id,
        title: ct.title,
        artists: ct.artists,
        coverUrl: ct.coverUrl || "",
        durationMs: ct.durationMs,
        playCount: 0,
        album: ct.albumTitle ? { id: ct.albumId || "", title: ct.albumTitle } : undefined,
      });
    }

    const downloadedIds = new Set(useOfflineStore.getState().downloadedTrackIds);
    let totalBytes = 0;
    const resultTracks: Track[] = [];

    for (const rec of audioRecords) {
      // Include if explicitly marked or present in audio records
      if (downloadedIds.has(rec.trackId) || (downloadedIds.size === 0 && rec.byteSize > 0)) {
        totalBytes += rec.byteSize;
        const track = trackMap.get(rec.trackId) || {
          id: rec.trackId,
          title: "Canción descargada",
          artists: "",
          coverUrl: "",
          durationMs: 0,
          playCount: 0,
        };
        resultTracks.push(track);
        if (!downloadedIds.has(rec.trackId)) {
          useOfflineStore.getState().markDownloaded(rec.trackId);
        }
      }
    }

    return { tracks: resultTracks, totalBytes };
  }

  async clearAllDownloads(): Promise<void> {
    const ids = [...useOfflineStore.getState().downloadedTrackIds];
    for (const id of ids) {
      await audioCache.deleteAudio(id);
    }
    useOfflineStore.getState().clearAll();
    showToast("Todas las descargas han sido eliminadas", "info");
  }
}

export const offlineManager = new OfflineManager();
