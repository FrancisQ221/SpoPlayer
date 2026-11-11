/**
 * 8D Spatial Audio Engine
 *
 * Simulates a realistic 360-degree circular rotation around the listener's head for headphones:
 * 1. Stereo Panner: Rotates the sound smoothly from left to right (sinusoidal panning).
 * 2. Head-Shadow Filter (HRTF): Dampens ultra-high frequencies slightly when the sound is
 *    perceived as behind the listener or on the opposite side.
 * 3. Depth Modulation: Micro-adjusts gain to simulate sound moving closer and further away.
 */

export type SpatialSpeed = "slow" | "normal" | "fast";

const SPEED_SECONDS: Record<SpatialSpeed, number> = {
  slow: 16,   // 16 seconds per 360° rotation
  normal: 10, // 10 seconds per 360° rotation
  fast: 5.5,  // 5.5 seconds per 360° rotation
};

interface SpatialState {
  ctx: AudioContext;
  input: GainNode;
  panner: StereoPannerNode;
  headFilter: BiquadFilterNode;
  depthGain: GainNode;
  output: GainNode;
  angle: number;
  lastTimestamp: number;
  rafId: number | null;
  enabled: boolean;
  speed: SpatialSpeed;
}

let activeSpatial: SpatialState | null = null;

export function getOrCreateSpatialAudioNodes(ctx: AudioContext): {
  input: AudioNode;
  output: AudioNode;
} {
  if (activeSpatial && activeSpatial.ctx === ctx) {
    return {
      input: activeSpatial.input,
      output: activeSpatial.output,
    };
  }

  destroySpatialAudio();

  const input = ctx.createGain();
  const depthGain = ctx.createGain();
  depthGain.gain.value = 1.0;

  const headFilter = ctx.createBiquadFilter();
  headFilter.type = "lowshelf";
  headFilter.frequency.value = 3500;
  headFilter.gain.value = 0; // 0 dB = flat when disabled

  // Fallback for environments lacking StereoPannerNode
  let panner: StereoPannerNode;
  try {
    panner = ctx.createStereoPanner();
    panner.pan.value = 0;
  } catch {
    // If not supported, bypass gracefully
    input.connect(depthGain);
    depthGain.connect(headFilter);
    return { input, output: headFilter };
  }

  const output = ctx.createGain();

  // Chain: input -> panner -> depthGain -> headFilter -> output
  input.connect(panner);
  panner.connect(depthGain);
  depthGain.connect(headFilter);
  headFilter.connect(output);

  activeSpatial = {
    ctx,
    input,
    panner,
    headFilter,
    depthGain,
    output,
    angle: 0,
    lastTimestamp: performance.now(),
    rafId: null,
    enabled: false,
    speed: "normal",
  };

  return { input, output };
}

function updateSpatialLoop(timestamp: number): void {
  if (!activeSpatial || !activeSpatial.enabled) return;

  const dt = Math.max(0, (timestamp - activeSpatial.lastTimestamp) / 1000);
  activeSpatial.lastTimestamp = timestamp;

  const period = SPEED_SECONDS[activeSpatial.speed] || 10;
  const angularSpeed = (2 * Math.PI) / period;

  activeSpatial.angle = (activeSpatial.angle + angularSpeed * dt) % (2 * Math.PI);

  const panValue = Math.sin(activeSpatial.angle); // -1 (left) to +1 (right)
  const depthValue = Math.cos(activeSpatial.angle); // -1 (behind) to +1 (front)

  const now = activeSpatial.ctx.currentTime;

  // 1. Smooth pan update
  activeSpatial.panner.pan.setTargetAtTime(panValue * 0.92, now, 0.04);

  // 2. Head-shadow filter: when sound is behind (depthValue < 0), attenuate highs by up to -4 dB
  const behindDampening = depthValue < 0 ? depthValue * 3.5 : 0;
  activeSpatial.headFilter.gain.setTargetAtTime(behindDampening, now, 0.05);

  // 3. Distance perception: sound is slightly quieter when furthest away
  const distanceModulation = 0.94 + 0.06 * (depthValue + 1) / 2;
  activeSpatial.depthGain.gain.setTargetAtTime(distanceModulation, now, 0.04);

  activeSpatial.rafId = requestAnimationFrame(updateSpatialLoop);
}

export function setSpatialAudioEnabled(enabled: boolean): void {
  if (!activeSpatial) return;
  activeSpatial.enabled = enabled;

  const now = activeSpatial.ctx.currentTime;
  if (!enabled) {
    if (activeSpatial.rafId !== null) {
      cancelAnimationFrame(activeSpatial.rafId);
      activeSpatial.rafId = null;
    }
    // Return to neutral center
    activeSpatial.panner.pan.setTargetAtTime(0, now, 0.1);
    activeSpatial.headFilter.gain.setTargetAtTime(0, now, 0.1);
    activeSpatial.depthGain.gain.setTargetAtTime(1.0, now, 0.1);
  } else {
    activeSpatial.lastTimestamp = performance.now();
    if (activeSpatial.rafId === null) {
      activeSpatial.rafId = requestAnimationFrame(updateSpatialLoop);
    }
  }
}

export function setSpatialAudioSpeed(speed: SpatialSpeed): void {
  if (!activeSpatial) return;
  activeSpatial.speed = speed;
}

export function destroySpatialAudio(): void {
  if (!activeSpatial) return;
  if (activeSpatial.rafId !== null) {
    cancelAnimationFrame(activeSpatial.rafId);
    activeSpatial.rafId = null;
  }
  try {
    activeSpatial.input.disconnect();
    activeSpatial.panner.disconnect();
    activeSpatial.depthGain.disconnect();
    activeSpatial.headFilter.disconnect();
    activeSpatial.output.disconnect();
  } catch {}
  activeSpatial = null;
}
