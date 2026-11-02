import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sleepTimerManager } from "./sleepTimer";
import { usePlayerStore } from "../store/playerStore";

describe("SleepTimerManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePlayerStore.setState({ sleepTimerType: null, sleepTimerEnd: null });
  });

  afterEach(() => {
    sleepTimerManager.setTimer(null);
    vi.useRealTimers();
  });

  it("sets timer with minutes and calculates end timestamp in store", () => {
    const before = Date.now();
    sleepTimerManager.setTimer(15);
    const end = usePlayerStore.getState().sleepTimerEnd;
    const type = usePlayerStore.getState().sleepTimerType;
    expect(type).toBe(15);
    expect(end).not.toBeNull();
    expect(end!).toBeGreaterThanOrEqual(before + 15 * 60 * 1000 - 50);
  });

  it("cancels timer and resets store state", () => {
    sleepTimerManager.setTimer(30);
    sleepTimerManager.setTimer(null);
    expect(usePlayerStore.getState().sleepTimerEnd).toBeNull();
    expect(usePlayerStore.getState().sleepTimerType).toBeNull();
  });

  it("handles end_of_track type correctly", () => {
    sleepTimerManager.setTimer("end_of_track");
    expect(usePlayerStore.getState().sleepTimerEnd).toBeNull();
    expect(usePlayerStore.getState().sleepTimerType).toBe("end_of_track");
  });
});
