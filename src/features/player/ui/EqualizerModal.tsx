import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloseLine, Refresh1Line } from "@mingcute/react";
import {
  useEqualizerStore,
  EQUALIZER_BANDS,
  EQUALIZER_PRESETS,
  type EqualizerPresetKey,
} from "../store/equalizerStore";
import ToggleSwitch from "@/shared/ui/ToggleSwitch";

interface EqualizerModalProps {
  open: boolean;
  onClose: () => void;
}

export const EqualizerModal = memo(function EqualizerModal({
  open,
  onClose,
}: EqualizerModalProps) {
  const enabled = useEqualizerStore((s) => s.enabled);
  const toggleEnabled = useEqualizerStore((s) => s.toggleEnabled);
  const preset = useEqualizerStore((s) => s.preset);
  const setPreset = useEqualizerStore((s) => s.setPreset);
  const gains = useEqualizerStore((s) => s.gains);
  const setBandGain = useEqualizerStore((s) => s.setBandGain);
  const reset = useEqualizerStore((s) => s.reset);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl bg-[#0f1412]/95 border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-6 overflow-hidden flex flex-col gap-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Ecualizador de audio
              </h2>
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  checked={enabled}
                  onChange={toggleEnabled}
                />
                <span
                  onClick={toggleEnabled}
                  className="text-xs font-semibold cursor-pointer select-none"
                  style={{
                    color: enabled
                      ? "var(--accent-primary, #00f59b)"
                      : "rgba(255,255,255,0.4)",
                  }}
                >
                  {enabled ? "Activo" : "Desactivado"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition-all flex items-center justify-center cursor-pointer border-0"
              title="Cerrar"
            >
              <CloseLine size={18} />
            </button>
          </div>

          {/* Presets Bar */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Preajustes
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(EQUALIZER_PRESETS) as EqualizerPresetKey[]).map((key) => {
                const isSelected = preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-[var(--accent-primary,#00f59b)]/15 border-[var(--accent-primary,#00f59b)]/40 text-[var(--accent-primary,#00f59b)] shadow-sm font-semibold"
                        : "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-white/70 hover:text-white"
                    }`}
                  >
                    {EQUALIZER_PRESETS[key].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5-Band Slider Board */}
          <div className="relative py-2 px-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            {/* Center 0 dB guide line */}
            <div className="absolute top-[48%] inset-x-6 h-[1px] bg-white/[0.08] pointer-events-none" />

            <div className="flex justify-between items-end gap-2 pt-4 pb-2">
              {EQUALIZER_BANDS.map((band, idx) => {
                const gain = gains[idx] ?? 0;
                return (
                  <div
                    key={band.freq}
                    className="flex flex-col items-center gap-3 flex-1 min-w-0"
                  >
                    {/* Gain dB Indicator */}
                    <span
                      className="text-[11px] font-mono font-semibold tabular-nums"
                      style={{
                        color:
                          gain > 0
                            ? "var(--accent-primary, #00f59b)"
                            : gain < 0
                            ? "#ff6b81"
                            : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {gain > 0 ? `+${gain.toFixed(0)}` : gain.toFixed(0)} dB
                    </span>

                    {/* Vertical Range Slider */}
                    <div className="h-36 flex items-center justify-center">
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={gain}
                        disabled={!enabled}
                        onChange={(e) => setBandGain(idx, parseFloat(e.target.value))}
                        className="h-32 w-1.5 accent-[var(--accent-primary,#00f59b)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed appearance-none bg-white/10 rounded-full"
                        style={{
                          WebkitAppearance: "slider-vertical",
                          writingMode: "bt-lr",
                        } as any}
                      />
                    </div>

                    {/* Band Frequency Label */}
                    <span className="text-[11px] font-medium text-white/60 select-none">
                      {band.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Reset & Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-xs font-medium border border-white/[0.08] cursor-pointer transition-all active:scale-95"
            >
              <Refresh1Line size={14} />
              <span>Restablecer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[var(--accent-primary,#00f59b)] text-black text-xs font-bold shadow-[0_0_16px_rgba(0,245,155,0.3)] hover:brightness-110 active:scale-95 cursor-pointer border-0 transition-all"
            >
              Aceptar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});
