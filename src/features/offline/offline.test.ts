import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/shared/api", () => ({
  api: {
    streamLyrics: vi.fn(),
  },
}));

import { useOfflineStore } from "./store/offlineStore";
import { offlineManager } from "./services/offlineManager";
import { spoplayerDb, audioCache } from "@/shared/storage";

describe("Offline Music System", () => {
  beforeEach(() => {
    useOfflineStore.getState().clearAll();
  });

  it("marks tracks as downloaded and removes them", () => {
    expect(useOfflineStore.getState().isDownloaded("track-1")).toBe(false);

    useOfflineStore.getState().markDownloaded("track-1");
    expect(useOfflineStore.getState().isDownloaded("track-1")).toBe(true);
    expect(useOfflineStore.getState().downloadedTrackIds).toContain("track-1");

    useOfflineStore.getState().markRemoved("track-1");
    expect(useOfflineStore.getState().isDownloaded("track-1")).toBe(false);
    expect(useOfflineStore.getState().downloadedTrackIds).not.toContain("track-1");
  });

  it("tracks download progress and errors", () => {
    useOfflineStore.getState().setDownloadProgress("track-2", 45, "Song Title", "Artist");
    expect(useOfflineStore.getState().isDownloading("track-2")).toBe(true);
    expect(useOfflineStore.getState().getDownloadProgress("track-2")).toBe(45);

    useOfflineStore.getState().setDownloadCompleted("track-2");
    expect(useOfflineStore.getState().isDownloading("track-2")).toBe(false);
    expect(useOfflineStore.getState().isDownloaded("track-2")).toBe(true);

    useOfflineStore.getState().setDownloadError("track-3", "Network failed");
    expect(useOfflineStore.getState().activeDownloads["track-3"]?.status).toBe("error");
    expect(useOfflineStore.getState().activeDownloads["track-3"]?.error).toBe("Network failed");
  });

  it("checks spoplayerDb audio presence for offline detection", async () => {
    const dummyBlob = new Blob(["dummy audio data"], { type: "audio/webm" });
    await spoplayerDb.putAudio("db-track-1", dummyBlob, "audio/webm");

    const isDownloaded = await offlineManager.isTrackDownloaded("db-track-1");
    expect(isDownloaded).toBe(true);
    expect(useOfflineStore.getState().isDownloaded("db-track-1")).toBe(true);

    await audioCache.deleteAudio("db-track-1");
    useOfflineStore.getState().markRemoved("db-track-1");
    expect(await spoplayerDb.hasAudio("db-track-1")).toBe(false);
  });
});
