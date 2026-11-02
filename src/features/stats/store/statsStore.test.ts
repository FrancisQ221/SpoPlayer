import { describe, it, expect } from "vitest";
import { getStatsSummary, type PlayRecord } from "./statsStore";

describe("statsStore getStatsSummary", () => {
  it("calculates summary correctly with empty records", () => {
    const summary = getStatsSummary([]);
    expect(summary.totalPlays).toBe(0);
    expect(summary.totalHours).toBe("0.0");
    expect(summary.uniqueArtists).toBe(0);
    expect(summary.topArtists).toEqual([]);
    expect(summary.topTrack).toBeNull();
  });

  it("computes top artists and obsession track", () => {
    const mockRecords: PlayRecord[] = [
      {
        trackId: "track-1",
        title: "Song Alpha",
        artist: "Artist A",
        durationMs: 180000,
        playedAt: new Date("2026-11-01T10:00:00Z").getTime(),
      },
      {
        trackId: "track-1",
        title: "Song Alpha",
        artist: "Artist A",
        durationMs: 180000,
        playedAt: new Date("2026-11-01T11:00:00Z").getTime(),
      },
      {
        trackId: "track-2",
        title: "Song Beta",
        artist: "Artist B",
        durationMs: 200000,
        playedAt: new Date("2026-11-01T21:00:00Z").getTime(),
      },
    ];

    const summary = getStatsSummary(mockRecords);
    expect(summary.totalPlays).toBe(3);
    expect(summary.uniqueArtists).toBe(2);
    expect(summary.topArtists[0].name).toBe("Artist A");
    expect(summary.topArtists[0].count).toBe(2);
    expect(summary.topTrack?.title).toBe("Song Alpha");
    expect(summary.topTrack?.count).toBe(2);
  });
});
