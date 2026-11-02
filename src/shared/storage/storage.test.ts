import { describe, it, expect, beforeEach } from "vitest";
import { spoplayerDb } from "./spoplayerDb";
import { audioCache } from "./audioCache";

describe("spoplayerDb storage layer", () => {
  beforeEach(async () => {
    await spoplayerDb.clearAll();
  });

  it("stores and retrieves track metadata", async () => {
    await spoplayerDb.putTrack({
      id: "track_test_1",
      title: "Test Song",
      artists: "Test Artist",
      durationMs: 180000,
      coverUrl: "",
      playCount: 0,
    });

    const record = await spoplayerDb.getTrack("track_test_1");
    expect(record).not.toBeNull();
    expect(record?.title).toBe("Test Song");
    expect(record?.artists).toBe("Test Artist");
    expect(record?.durationMs).toBe(180000);
  });

  it("drops audio downloaded before a cache clear", async () => {
    const generation = audioCache.currentGeneration();
    audioCache.invalidate();
    const blob = new Blob(["late download"], { type: "audio/webm" });
    expect(await audioCache.saveAudioBlob("track_after_clear", blob, "audio/webm", generation)).toBe(false);
    expect(await audioCache.hasAudio("track_after_clear")).toBe(false);
    expect(await audioCache.saveAudioBlob("track_after_clear", blob, "audio/webm", audioCache.currentGeneration())).toBe(true);
    expect(await audioCache.hasAudio("track_after_clear")).toBe(true);
  });

  it("stores, checks, and calculates total bytes for audio blobs", async () => {
    const dummyBlob = new Blob(["dummy audio data content"], { type: "audio/ogg" });
    await audioCache.saveAudioBlob("track_audio_1", dummyBlob, "audio/ogg");

    const hasAudio = await audioCache.hasAudio("track_audio_1");
    expect(hasAudio).toBe(true);

    const totalBytes = await spoplayerDb.getTotalAudioBytes();
    expect(totalBytes).toBe(dummyBlob.size);

    await audioCache.deleteAudio("track_audio_1");
    const hasAudioAfter = await audioCache.hasAudio("track_audio_1");
    expect(hasAudioAfter).toBe(false);
  });

  it("stores lyrics and updates weekly checked timestamp", async () => {
    const initialTime = Date.now() - 10000;
    await spoplayerDb.putLyrics({
      trackId: "track_lyric_1",
      syncLevel: "word_level",
      quality: 95,
      activeProvider: "kugou",
      availableProviders: [],
      rawLyrics: "[00:01.00] Hello world",
      rawFormat: "lrc",
      candidate: {
        provider: "kugou",
        contentKind: "word_synced",
        syncLevel: "word_level",
        quality: {
          total: 95,
          match: 30,
          content: 30,
          sync: 35,
          source: 0,
          reasons: [],
        },
        lyrics: {
          format: "lrc",
          content: "[00:01.00] Hello world",
        },
      },
      lastCheckedAt: initialTime,
      updatedAt: initialTime,
    });

    const record = await spoplayerDb.getLyrics("track_lyric_1");
    expect(record).not.toBeNull();
    expect(record?.syncLevel).toBe("word_level");
    expect(record?.quality).toBe(95);
    expect(record?.lastCheckedAt).toBe(initialTime);

    await spoplayerDb.updateLyricsChecked("track_lyric_1");
    const updated = await spoplayerDb.getLyrics("track_lyric_1");
    expect(updated?.lastCheckedAt).toBeGreaterThan(initialTime);

    await spoplayerDb.putLyrics({
      trackId: "track_line_only",
      syncLevel: "line_level",
      quality: 60,
      activeProvider: "lrclib",
      availableProviders: [],
      rawLyrics: "[00:01.00] Line only",
      rawFormat: "lrc",
      candidate: {
        provider: "lrclib",
        contentKind: "line_synced",
        syncLevel: "line_level",
        quality: {
          total: 60,
          match: 20,
          content: 20,
          sync: 20,
          source: 0,
          reasons: [],
        },
        lyrics: {
          format: "lrc",
          content: "[00:01.00] Line only",
        },
      },
      lastCheckedAt: initialTime,
      updatedAt: initialTime,
    });
    const lineRecord = await spoplayerDb.getLyrics("track_line_only");
    expect(lineRecord).not.toBeNull();
    expect(lineRecord?.activeProvider).toBe("lrclib");
    expect(lineRecord?.syncLevel).toBe("line_level");

    // cadence / polaris with line_level should not be cached
    await spoplayerDb.putLyrics({
      trackId: "track_cadence_line",
      syncLevel: "line_level",
      quality: 70,
      activeProvider: "cadence",
      availableProviders: [],
      rawLyrics: "[00:01.00] Cadence line",
      rawFormat: "lrc",
      candidate: {
        provider: "cadence",
        contentKind: "line_synced",
        syncLevel: "line_level",
        quality: {
          total: 70,
          match: 20,
          content: 20,
          sync: 30,
          source: 0,
          reasons: [],
        },
        lyrics: {
          format: "lrc",
          content: "[00:01.00] Cadence line",
        },
      },
      lastCheckedAt: initialTime,
      updatedAt: initialTime,
    });
    const cadenceRecord = await spoplayerDb.getLyrics("track_cadence_line");
    expect(cadenceRecord).toBeNull();
  });

  it("stores artist data and calculates total artist bytes", async () => {
    const initialTime = Date.now() - 50000;
    await spoplayerDb.putArtist({
      id: "artist_test_1",
      data: {
        title: "Test Artist",
        description: "Bio",
        coverUrl: "https://example.com/cover.jpg",
        verified: true,
        tracks: [],
        popularSongs: [],
        albums: [],
        reposts: [],
        singles: [],
      },
      savedAt: initialTime,
      lastCheckedAt: initialTime,
    });

    const record = await spoplayerDb.getArtist("artist_test_1");
    expect(record).not.toBeNull();
    expect(record?.data.title).toBe("Test Artist");
    expect(record?.lastCheckedAt).toBe(initialTime);

    const totalBytes = await spoplayerDb.getTotalArtistBytes();
    expect(totalBytes).toBeGreaterThan(0);

    await spoplayerDb.updateArtistChecked("artist_test_1");
    const updated = await spoplayerDb.getArtist("artist_test_1");
    expect(updated?.lastCheckedAt).toBeGreaterThan(initialTime);
  });

  it("keeps only the most recent audio blobs in memory instead of every played track", async () => {
    for (let i = 1; i <= 6; i++) {
      await spoplayerDb.putAudio(`track_mem_${i}`, new Blob([`audio ${i}`], { type: "audio/ogg" }), "audio/ogg");
    }
    const inMemory = [...(spoplayerDb as unknown as { memAudio: Map<string, unknown> }).memAudio.keys()];
    expect(inMemory).toEqual(["track_mem_4", "track_mem_5", "track_mem_6"]);

    await spoplayerDb.getAudio("track_mem_5");
    const afterRead = [...(spoplayerDb as unknown as { memAudio: Map<string, unknown> }).memAudio.keys()];
    expect(afterRead).toEqual(["track_mem_4", "track_mem_6", "track_mem_5"]);
  });

  it("tracks lastPlayedAt on putAudio and touchAudio", async () => {
    const blob1 = new Blob(["audio content 1"], { type: "audio/ogg" });
    const earlyTime = 100000;
    await spoplayerDb.putAudio("track_lru_1", blob1, "audio/ogg", earlyTime);

    const initial = await spoplayerDb.getAudio("track_lru_1");
    expect(initial?.lastPlayedAt).toBe(earlyTime);

    await spoplayerDb.touchAudio("track_lru_1");
    const touched = await spoplayerDb.getAudio("track_lru_1");
    expect(touched?.lastPlayedAt).toBeGreaterThan(earlyTime);
  });

  it("enforces cache limit and evicts oldest played tracks first", async () => {
    const chunk1 = new Blob(["1234567890".repeat(10)], { type: "audio/ogg" });
    const chunk2 = new Blob(["1234567890".repeat(10)], { type: "audio/ogg" });
    const chunk3 = new Blob(["1234567890".repeat(10)], { type: "audio/ogg" });

    await spoplayerDb.putAudio("track_oldest", chunk1, "audio/ogg", 1000);
    await spoplayerDb.putAudio("track_middle", chunk2, "audio/ogg", 2000);
    await spoplayerDb.putAudio("track_newest", chunk3, "audio/ogg", 3000);

    const initialTotal = await spoplayerDb.getTotalAudioBytes();
    expect(initialTotal).toBe(300);

    const limit = 200;
    const evicted = await audioCache.enforceCacheLimit(limit);
    expect(evicted).toBeGreaterThan(0);

    const hasOldest = await audioCache.hasAudio("track_oldest");
    const hasNewest = await audioCache.hasAudio("track_newest");

    expect(hasOldest).toBe(false);
    expect(hasNewest).toBe(true);
  });

  it("handles getLimitBytes and setLimitBytes with defaults and clamping", async () => {
    const memStorage = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => memStorage.get(key) ?? null,
      setItem: (key: string, val: string) => memStorage.set(key, val),
      removeItem: (key: string) => memStorage.delete(key),
      clear: () => memStorage.clear(),
      length: 0,
      key: () => null,
    };
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    expect(audioCache.getLimitBytes()).toBe(3 * 1024 * 1024 * 1024);

    await audioCache.setLimitBytes(100);
    expect(audioCache.getLimitBytes()).toBe(250 * 1024 * 1024);

    await audioCache.setLimitBytes(0);
    expect(audioCache.getLimitBytes()).toBe(0);

    await audioCache.setLimitBytes(5 * 1024 * 1024 * 1024);
    expect(audioCache.getLimitBytes()).toBe(5 * 1024 * 1024 * 1024);
  });
});
