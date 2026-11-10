/**
 * Dynamic Leveling (Loudness Normalization)
 * 
 * Measures RMS loudness of the first few seconds of a new track via AnalyserNode,
 * then applies a compensating GainNode so all tracks play at a consistent loudness target.
 * This is a lightweight real-time alternative to offline ReplayGain metadata.
 */

// Target RMS level (linear scale). -18 dBFS ≈ 0.126
const TARGET_RMS = 0.126;
// Minimum and maximum compensation gain (prevents clipping on very quiet tracks)
const MIN_GAIN = 0.5;
const MAX_GAIN = 3.0;
// How many analysis frames to average before committing a gain value
const ANALYSIS_FRAMES = 60;
// Smoothing time constant for the GainNode ramp (seconds)
const RAMP_TIME = 1.5;

interface LevelingState {
  analyser: AnalyserNode;
  gainNode: GainNode;
  buffer: Float32Array;
  frameCount: number;
  rmsAccum: number;
  rafId: number | null;
  enabled: boolean;
}

let state: LevelingState | null = null;

/** Returns the compensating GainNode that should sit in the audio graph AFTER the source */
export function getOrCreateDynamicLevelingNodes(ctx: AudioContext): {
  input: GainNode;
  output: GainNode;
} {
  if (state && state.gainNode.context === ctx) {
    return { input: state.gainNode, output: state.gainNode };
  }

  destroyDynamicLeveling();

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.0;

  // analyser is tapped in parallel (not in series) - analysis only
  const buffer = new Float32Array(analyser.fftSize);

  state = {
    analyser,
    gainNode,
    buffer,
    frameCount: 0,
    rmsAccum: 0,
    rafId: null,
    enabled: true,
  };

  return { input: gainNode, output: gainNode };
}

/** Connect the source audio node to both the leveling gain and the analyser in parallel */
export function connectSourceToLeveling(sourceNode: AudioNode): void {
  if (!state) return;
  sourceNode.connect(state.analyser);
}

/** Called when a new track starts - resets measurement and begins RMS sampling */
export function startDynamicLevelingForNewTrack(): void {
  if (!state || !state.enabled) return;

  // Cancel any in-progress analysis
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  state.frameCount = 0;
  state.rmsAccum = 0;

  // Start measuring
  measureLoop();
}

function measureLoop(): void {
  if (!state) return;

  state.analyser.getFloatTimeDomainData(state.buffer as unknown as Float32Array<ArrayBuffer>);

  // Compute RMS for this frame
  let sumSq = 0;
  for (let i = 0; i < state.buffer.length; i++) {
    sumSq += state.buffer[i] * state.buffer[i];
  }
  const rms = Math.sqrt(sumSq / state.buffer.length);

  // Skip silent frames (avoid skewing by pre-roll silence)
  if (rms > 0.001) {
    state.rmsAccum += rms;
    state.frameCount++;
  }

  if (state.frameCount < ANALYSIS_FRAMES) {
    state.rafId = requestAnimationFrame(measureLoop);
  } else {
    // Enough frames collected - compute target gain
    const avgRms = state.rmsAccum / state.frameCount;
    if (avgRms > 0) {
      const rawGain = TARGET_RMS / avgRms;
      const clampedGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, rawGain));
      const ctx = state.gainNode.context as AudioContext;
      state.gainNode.gain.setTargetAtTime(clampedGain, ctx.currentTime, RAMP_TIME);
    }
    state.rafId = null;
  }
}

export function setDynamicLevelingEnabled(enabled: boolean): void {
  if (!state) return;
  state.enabled = enabled;
  if (!enabled) {
    // Reset gain to 1.0 when disabled
    const ctx = state.gainNode.context as AudioContext;
    state.gainNode.gain.setTargetAtTime(1.0, ctx.currentTime, 0.3);
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }
}

export function destroyDynamicLeveling(): void {
  if (!state) return;
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
  }
  try {
    state.analyser.disconnect();
    state.gainNode.disconnect();
  } catch {}
  state = null;
}
