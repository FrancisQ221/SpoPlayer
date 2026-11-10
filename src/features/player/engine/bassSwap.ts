/**
 * Bass-Swap Crossfade Filter
 * 
 * During crossfade, applies a highpass filter to the OUTGOING track's audio
 * so its bass frequencies gradually cut out, preventing muddy bass overlap
 * with the incoming track. This is the technique used by Orchard music player.
 */

interface BassSwapState {
  filter: BiquadFilterNode;
  ctx: AudioContext;
  active: boolean;
}

let bassSwapState: BassSwapState | null = null;

/** Call when the audio graph is set up. Inserts a highpass filter node. 
 *  Returns the filter node to place in the chain (or null if unsupported). */
export function getOrCreateBassSwapFilter(ctx: AudioContext): BiquadFilterNode | null {
  if (bassSwapState && bassSwapState.ctx === ctx) {
    return bassSwapState.filter;
  }

  destroyBassSwapFilter();

  try {
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 20; // Start at 20Hz (essentially flat / pass-through)
    filter.Q.value = 0.5;

    bassSwapState = { filter, ctx, active: false };
    return filter;
  } catch {
    return null;
  }
}

/**
 * Called each animation frame during crossfade.
 * @param progress - 0.0 (crossfade start) to 1.0 (crossfade complete / track almost ended)
 *                   NOTE: in SpoPlayer, fadeProgress goes from 1.0 → 0.0 (time remaining / crossfadeSec)
 *                   So pass (1 - fadeProgress) here.
 * @param bassSwapEnabled - whether the feature is on
 */
export function applyBassSwapToOutgoing(progress: number, bassSwapEnabled: boolean): void {
  if (!bassSwapState || !bassSwapEnabled) return;

  // As crossfade progresses (progress 0→1), sweep highpass from 20Hz up to 300Hz
  // This cuts bass from the outgoing track increasingly as it fades out
  const minFreq = 20;
  const maxFreq = 300;
  const targetFreq = minFreq + (maxFreq - minFreq) * Math.pow(progress, 1.5);

  bassSwapState.filter.frequency.setTargetAtTime(
    targetFreq,
    bassSwapState.ctx.currentTime,
    0.05,
  );
  bassSwapState.active = true;
}

/** Reset the highpass filter to pass-through (call when crossfade ends or track changes) */
export function resetBassSwapFilter(): void {
  if (!bassSwapState) return;
  bassSwapState.filter.frequency.setTargetAtTime(20, bassSwapState.ctx.currentTime, 0.05);
  bassSwapState.active = false;
}

export function destroyBassSwapFilter(): void {
  if (!bassSwapState) return;
  try {
    bassSwapState.filter.disconnect();
  } catch {}
  bassSwapState = null;
}
