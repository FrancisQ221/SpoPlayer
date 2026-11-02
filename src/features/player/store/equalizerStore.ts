import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";

export type EqualizerPresetKey =
  | "flat"
  | "bass_boost"
  | "treble_boost"
  | "vocal"
  | "electronic"
  | "rock"
  | "pop"
  | "acoustic"
  | "custom";

export interface EqualizerBandConfig {
  freq: number;
  label: string;
  type: BiquadFilterType;
}

export const EQUALIZER_BANDS: EqualizerBandConfig[] = [
  { freq: 60, label: "60 Hz", type: "lowshelf" },
  { freq: 230, label: "230 Hz", type: "peaking" },
  { freq: 910, label: "910 Hz", type: "peaking" },
  { freq: 3600, label: "3.6 kHz", type: "peaking" },
  { freq: 14000, label: "14 kHz", type: "highshelf" },
];

export const EQUALIZER_PRESETS: Record<EqualizerPresetKey, { label: string; gains: number[] }> = {
  flat: { label: "Plano", gains: [0, 0, 0, 0, 0] },
  bass_boost: { label: "Refuerzo de graves", gains: [6, 4, 1, 0, 0] },
  treble_boost: { label: "Refuerzo de agudos", gains: [-1, 0, 1, 4, 6] },
  vocal: { label: "Voz y acústica", gains: [-2, 1, 5, 3, -1] },
  electronic: { label: "Electrónica / EDM", gains: [5, 3, 0, 2, 4] },
  rock: { label: "Rock", gains: [4, 2, -1, 3, 5] },
  pop: { label: "Pop", gains: [1, 2, 4, 2, 1] },
  acoustic: { label: "Acústico", gains: [2, 1, 2, 3, 3] },
  custom: { label: "Personalizado", gains: [0, 0, 0, 0, 0] },
};

interface EqualizerState {
  enabled: boolean;
  preset: EqualizerPresetKey;
  gains: number[]; // 5 band gains in dB (-12 to +12)
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setPreset: (preset: EqualizerPresetKey) => void;
  setBandGain: (bandIndex: number, gain: number) => void;
  reset: () => void;
}

export const useEqualizerStore = create<EqualizerState>()(
  persist(
    (set) => ({
      enabled: false,
      preset: "flat",
      gains: [0, 0, 0, 0, 0],
      setEnabled: (enabled) => set({ enabled }),
      toggleEnabled: () => set((s) => ({ enabled: !s.enabled })),
      setPreset: (preset) => {
        const gains = EQUALIZER_PRESETS[preset]?.gains || [0, 0, 0, 0, 0];
        set({ preset, gains: [...gains] });
      },
      setBandGain: (index, gain) =>
        set((state) => {
          const next = [...state.gains];
          next[index] = Math.max(-12, Math.min(12, Math.round(gain * 10) / 10));
          return { gains: next, preset: "custom" };
        }),
      reset: () => set({ preset: "flat", gains: [0, 0, 0, 0, 0], enabled: false }),
    }),
    {
      name: "spoplayer_equalizer",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        preset: state.preset,
        gains: state.gains,
      }),
    },
  ),
);
