import { memo, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLyricsStore } from "../store/lyricsStore";
import { usePlayerState } from "@/features/player/hooks/usePlayerState";
import { playerEngine } from "@/features/player";
import type { SyncedLine } from "../engine/lyricsParser";

interface CinematicLyricsViewProps {
  lines?: SyncedLine[];
}

export const CinematicLyricsView = memo(function CinematicLyricsView({
  lines: propLines,
}: CinematicLyricsViewProps) {
  const storeSyncedLines = useLyricsStore((s) => s.syncedLines);
  const braccatoLyrics = useLyricsStore((s) => s.braccatoLyrics);

  const lines = useMemo(() => {
    if (propLines && propLines.length > 0) return propLines;
    if (storeSyncedLines && storeSyncedLines.length > 0) return storeSyncedLines;
    if (braccatoLyrics && braccatoLyrics.length > 0) {
      return braccatoLyrics.map((b: any) => ({
        timeMs: b.startTimeMs ?? 0,
        words:
          b.words && b.words.length > 0
            ? b.words
            : [
                {
                  text: b.text || "",
                  startTimeMs: b.startTimeMs ?? 0,
                  endTimeMs: (b.startTimeMs ?? 0) + (b.durationMs ?? 3000),
                },
              ],
      }));
    }
    return [];
  }, [propLines, storeSyncedLines, braccatoLyrics]);

  const player = usePlayerState();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  const currentMs = player.positionMs;

  // Determine active line index
  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timeMs <= currentMs) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Smooth scroll to active line
  const scrollToActive = useCallback(() => {
    if (!activeLineRef.current || !containerRef.current) return;
    activeLineRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  useEffect(() => {
    scrollToActive();
  }, [activeIndex, scrollToActive]);

  if (!lines || lines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary text-base">
        No hay letras sincronizadas disponibles
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-y-auto no-scrollbar py-32 px-6 flex flex-col gap-6 select-none"
      style={{ scrollBehavior: "smooth" }}
    >
      {lines.map((line, idx) => {
        const isActive = idx === activeIndex;
        const dist = Math.abs(idx - activeIndex);

        // Visual depth styling based on distance to active line
        let opacity = 0.2;
        let scale = 0.92;
        let blur = "blur(1.5px)";

        if (isActive) {
          opacity = 1;
          scale = 1.04;
          blur = "blur(0px)";
        } else if (dist === 1) {
          opacity = 0.55;
          scale = 0.96;
          blur = "blur(0.5px)";
        } else if (dist === 2) {
          opacity = 0.35;
          scale = 0.94;
          blur = "blur(1px)";
        }

        const lineText =
          (line as any).text ||
          (line.words ? line.words.map((w: any) => w.text).join("") : "");

        return (
          <motion.div
            key={`${line.timeMs}-${idx}`}
            ref={isActive ? activeLineRef : null}
            onClick={() => playerEngine.seek(line.timeMs)}
            animate={{
              opacity,
              scale,
              filter: blur,
            }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`cursor-pointer transition-colors duration-200 text-left py-2 px-3 rounded-2xl ${
              isActive
                ? "text-[var(--accent-primary,#00f59b)] font-extrabold text-2xl sm:text-3xl drop-shadow-[0_0_25px_rgba(0,245,155,0.35)]"
                : "text-white/80 hover:text-white font-semibold text-xl sm:text-2xl"
            }`}
          >
            {lineText}
          </motion.div>
        );
      })}
    </div>
  );
});
