import { memo, useEffect, useState } from "react";
import { MoonLine, CloseLine, CheckLine, TimeLine } from "@mingcute/react";
import { usePlayerStore } from "../store/playerStore";
import { sleepTimerManager } from "../engine/sleepTimer";

interface SleepTimerPickerProps {
  onClose: () => void;
}

export const SleepTimerPicker = memo(function SleepTimerPicker({
  onClose,
}: SleepTimerPickerProps) {
  const sleepTimerType = usePlayerStore((s) => s.sleepTimerType);
  const sleepTimerEnd = usePlayerStore((s) => s.sleepTimerEnd);
  const [remainingText, setRemainingText] = useState("");

  useEffect(() => {
    if (!sleepTimerEnd) {
      setRemainingText("");
      return;
    }
    const update = () => {
      const diff = Math.max(0, sleepTimerEnd - Date.now());
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemainingText(`${mins}:${String(secs).padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd]);

  const options: { label: string; value: number | "end_of_track" }[] = [
    { label: "En 15 minutos", value: 15 },
    { label: "En 30 minutos", value: 30 },
    { label: "En 45 minutos", value: 45 },
    { label: "En 1 hora", value: 60 },
    { label: "Al finalizar esta canción", value: "end_of_track" },
  ];

  return (
    <div className="flex flex-col gap-2 min-w-[220px] select-none">
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <MoonLine size={16} className="text-[var(--accent-primary,#00f59b)]" />
          <span className="text-[12.5px] font-bold text-text-primary tracking-wide">
            Temporizador de Sueño
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-tertiary hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors border-0 bg-transparent cursor-pointer"
        >
          <CloseLine size={14} />
        </button>
      </div>

      {sleepTimerType !== null && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--accent-primary,#00f59b)]/12 border border-[var(--accent-primary,#00f59b)]/25">
          <div className="flex items-center gap-1.5 text-[var(--accent-primary,#00f59b)] text-[11.5px] font-semibold">
            <TimeLine size={14} />
            <span>
              {sleepTimerType === "end_of_track"
                ? "Fin de pista"
                : `Quedan ${remainingText}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sleepTimerManager.setTimer(null);
              onClose();
            }}
            className="text-[11px] text-red-400 hover:text-red-300 font-medium bg-transparent border-0 cursor-pointer hover:underline"
          >
            Desactivar
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1 pt-0.5">
        {options.map((opt) => {
          const isSelected = sleepTimerType === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                sleepTimerManager.setTimer(opt.value);
                onClose();
              }}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-[12.5px] border transition-all cursor-pointer ${
                isSelected
                  ? "bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] border-[var(--accent-primary,#00f59b)]/30 font-medium"
                  : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.05] border-transparent"
              }`}
            >
              <span>{opt.label}</span>
              {isSelected && <CheckLine size={14} className="text-[var(--accent-primary,#00f59b)]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
});
