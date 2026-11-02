import { usePlayerStore } from "../store/playerStore";
import { playerEngine } from "./playerEngine";
import { showToast } from "@/shared/ui";

class SleepTimerManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private baseVolume: number | null = null;

  constructor() {
    this.startWatcher();
  }

  private startWatcher() {
    if (typeof window === "undefined") return;
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public setTimer(minutes: number | "end_of_track" | null) {
    const store = usePlayerStore.getState();

    if (minutes === null) {
      if (this.baseVolume !== null) {
        store.setVolume(this.baseVolume);
        this.baseVolume = null;
      }
      store.setSleepTimer(null, null);
      showToast("Temporizador de apagado desactivado", "info");
      return;
    }

    if (minutes === "end_of_track") {
      store.setSleepTimer("end_of_track", null);
      showToast("Se detendrá al terminar la canción actual", "success");
      return;
    }

    const targetTimestamp = Date.now() + minutes * 60 * 1000;
    store.setSleepTimer(minutes, targetTimestamp);
    showToast(`Se detendrá en ${minutes} minutos`, "success");
  }

  public onTrackEnded() {
    const store = usePlayerStore.getState();
    if (store.sleepTimerType === "end_of_track") {
      playerEngine.pause();
      this.setTimer(null);
      showToast("Música pausada por temporizador de apagado", "info");
    }
  }

  private tick() {
    const store = usePlayerStore.getState();
    const { sleepTimerEnd, sleepTimerType, status, volume } = store;

    if (!sleepTimerEnd || sleepTimerType === "end_of_track" || status !== "playing") {
      return;
    }

    const now = Date.now();
    const remainingMs = sleepTimerEnd - now;

    if (remainingMs <= 0) {
      // Time is up!
      if (this.baseVolume !== null) {
        store.setVolume(this.baseVolume);
        this.baseVolume = null;
      }
      playerEngine.pause();
      store.setSleepTimer(null, null);
      showToast("Música pausada por temporizador de apagado", "info");
      return;
    }

    // Smooth fade out in the last 45 seconds
    const FADE_WINDOW_MS = 45 * 1000;
    if (remainingMs <= FADE_WINDOW_MS) {
      if (this.baseVolume === null) {
        this.baseVolume = volume > 0 ? volume : 1;
      }
      const progress = Math.max(0, remainingMs / FADE_WINDOW_MS);
      const fadedVolume = this.baseVolume * progress;
      store.setVolume(fadedVolume);
    }
  }
}

export const sleepTimerManager = new SleepTimerManager();
