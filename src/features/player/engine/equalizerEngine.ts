import {
  EQUALIZER_BANDS,
  useEqualizerStore,
} from "../store/equalizerStore";

interface EqualizerGraph {
  ctx: AudioContext;
  filters: BiquadFilterNode[];
  inputGain: GainNode;
  outputGain: GainNode;
}

let activeGraph: EqualizerGraph | null = null;
let unsubscribeStore: (() => void) | null = null;

export function getOrCreateEqualizerNodes(ctx: AudioContext): {
  input: AudioNode;
  output: AudioNode;
} {
  if (activeGraph && activeGraph.ctx === ctx) {
    return {
      input: activeGraph.inputGain,
      output: activeGraph.outputGain,
    };
  }

  // Dispose previous graph if any
  if (activeGraph) {
    try {
      activeGraph.inputGain.disconnect();
      activeGraph.filters.forEach((f) => f.disconnect());
      activeGraph.outputGain.disconnect();
    } catch {}
  }

  const inputGain = ctx.createGain();
  const outputGain = ctx.createGain();

  // Create 5 BiquadFilterNodes
  const filters: BiquadFilterNode[] = EQUALIZER_BANDS.map((band) => {
    const filter = ctx.createBiquadFilter();
    filter.type = band.type;
    filter.frequency.value = band.freq;
    if (band.type === "peaking") {
      filter.Q.value = 1.2;
    }
    filter.gain.value = 0;
    return filter;
  });

  // Chain: inputGain -> f0 -> f1 -> f2 -> f3 -> f4 -> outputGain
  inputGain.connect(filters[0]);
  for (let i = 0; i < filters.length - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }
  filters[filters.length - 1].connect(outputGain);

  activeGraph = {
    ctx,
    filters,
    inputGain,
    outputGain,
  };

  // Sync initial gains
  applyStoreGainsToGraph();

  // Listen for changes
  if (!unsubscribeStore) {
    unsubscribeStore = useEqualizerStore.subscribe(() => {
      applyStoreGainsToGraph();
    });
  }

  return {
    input: inputGain,
    output: outputGain,
  };
}

function applyStoreGainsToGraph() {
  if (!activeGraph) return;
  const { enabled, gains } = useEqualizerStore.getState();
  const now = activeGraph.ctx.currentTime;

  activeGraph.filters.forEach((filter, i) => {
    const targetGain = enabled ? (gains[i] ?? 0) : 0;
    filter.gain.setTargetAtTime(targetGain, now, 0.04);
  });
}
