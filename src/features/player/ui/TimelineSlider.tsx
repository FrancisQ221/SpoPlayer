import { useState, useRef, useCallback, memo } from "react";
import { motion } from "framer-motion";

export interface TimelineSliderProps {
  positionMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  size?: "xs" | "sm" | "md" | "lg";
  trackBg?: string;
  trackActiveBg?: string;
  fillColor?: string;
  showTime?: boolean;
  showThumb?: boolean;
  showTooltip?: boolean;
  onScrub?: (positionMs: number) => void;
}

export function formatPlaybackTime(ms: number): string {
  if (!ms || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export const TimelineSlider = memo(function TimelineSlider({
  positionMs,
  durationMs,
  onSeek,
  className = "",
  trackClassName = "",
  fillClassName = "",
  size = "md",
  trackBg,
  trackActiveBg,
  fillColor,
  showTime = false,
  showThumb = true,
  showTooltip = true,
  onScrub,
}: TimelineSliderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const duration = Math.max(0, durationMs);
  const currentPosition =
    isDragging && scrubPosition !== null
      ? scrubPosition
      : Math.min(Math.max(0, positionMs), duration || Infinity);

  const progress =
    duration > 0 ? Math.min(1, Math.max(0, currentPosition / duration)) : 0;
  const percentage = progress * 100;

  const calculatePositionFromPointer = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return currentPosition;
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      return ratio * duration;
    },
    [currentPosition, duration],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      const targetPos = calculatePositionFromPointer(e.clientX);
      setScrubPosition(targetPos);
      onScrub?.(targetPos);

      const onPointerMove = (ev: PointerEvent) => {
        const pos = calculatePositionFromPointer(ev.clientX);
        setScrubPosition(pos);
        onScrub?.(pos);
      };

      const onPointerUp = (ev: PointerEvent) => {
        const finalPos = calculatePositionFromPointer(ev.clientX);
        setIsDragging(false);
        setScrubPosition(null);
        try {
          (e.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
        } catch {}
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        onSeek(finalPos);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [calculatePositionFromPointer, onScrub, onSeek],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (duration <= 0) return;
      const step = 5000; // 5 seconds
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onSeek(Math.min(duration, currentPosition + step));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSeek(Math.max(0, currentPosition - step));
      } else if (e.key === "Home") {
        e.preventDefault();
        onSeek(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onSeek(duration);
      }
    },
    [currentPosition, duration, onSeek],
  );

  const containerHeights = {
    xs: "h-[14px]",
    sm: "h-[18px]",
    md: "h-[22px]",
    lg: "h-[26px]",
  }[size];

  const baseTrackHeights = {
    xs: "h-[3px]",
    sm: "h-[4px]",
    md: "h-[5px]",
    lg: "h-[6px]",
  }[size];

  const scaleYFactor = {
    xs: 1.8,
    sm: 1.5,
    md: 1.4,
    lg: 1.3,
  }[size];

  const isActive = isHovered || isDragging;

  const defaultTrackBg = trackBg ?? "rgba(255, 255, 255, 0.16)";
  const defaultTrackActiveBg = trackActiveBg ?? "rgba(255, 255, 255, 0.28)";

  return (
    <div
      className={`group relative flex ${containerHeights} items-center select-none prevent-seek ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoverRatio(null);
      }}
    >
      {showTime && (
        <span className="text-[11px] tabular-nums text-text-tertiary w-[36px] text-right shrink-0 pr-[8px]">
          {formatPlaybackTime(currentPosition)}
        </span>
      )}

      <div
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentPosition}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          const rect = trackRef.current?.getBoundingClientRect();
          if (!rect || rect.width === 0) return;
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          setHoverRatio(ratio);
        }}
        onPointerLeave={() => setHoverRatio(null)}
        className="relative flex h-full flex-1 items-center cursor-pointer outline-none"
      >
        <motion.div
          ref={trackRef}
          initial={false}
          animate={{
            scaleY: isActive ? scaleYFactor : 1,
            backgroundColor: isActive ? defaultTrackActiveBg : defaultTrackBg,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          className={`relative w-full rounded-full overflow-hidden origin-center ${baseTrackHeights} ${trackClassName}`}
        >
          {/* Hover preview bar */}
          {isHovered && !isDragging && hoverRatio !== null && (
            <div
              className="absolute inset-y-0 left-0 bg-white/20 dark:bg-white/25 rounded-full pointer-events-none transition-[width] duration-75"
              style={{ width: `${hoverRatio * 100}%` }}
            />
          )}

          {/* Current progress fill */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-[width] ease-out ${
              isDragging ? "duration-0" : "duration-100"
            } ${fillClassName || "bg-[var(--accent-primary,#00f59b)]"}`}
            style={{
              width: `${percentage}%`,
              ...(fillColor ? { backgroundColor: fillColor } : {}),
            }}
          />
        </motion.div>

        {/* Thumb indicator */}
        {showThumb && (
          <div
            className="pointer-events-none absolute top-1/2 rounded-full z-10 transition-transform duration-150 ease-out"
            style={{
              left: `${percentage}%`,
              width: size === "xs" ? 9 : 12,
              height: size === "xs" ? 9 : 12,
              backgroundColor: fillColor || "var(--accent-primary, #00f59b)",
              boxShadow: "0 0 10px var(--accent-primary, #00f59b), 0 1px 3px rgba(0,0,0,0.5)",
              transform: `translate(-50%, -50%) scale(${isActive ? 1 : 0})`,
              opacity: isActive ? 1 : 0,
            }}
          />
        )}

        {/* Hover timestamp tooltip */}
        {showTooltip && isHovered && hoverRatio !== null && duration > 0 && (
          <div
            className="pointer-events-none absolute -top-7 rounded bg-[#0e1612]/95 border border-[var(--accent-primary,#00f59b)]/30 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-primary,#00f59b)] shadow-lg tabular-nums z-50 whitespace-nowrap transition-transform duration-75"
            style={{
              left: `${hoverRatio * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {formatPlaybackTime(hoverRatio * duration)}
          </div>
        )}
      </div>

      {showTime && (
        <span className="text-[11px] tabular-nums text-text-tertiary w-[36px] shrink-0 pl-[8px]">
          {formatPlaybackTime(duration)}
        </span>
      )}
    </div>
  );
});

export default TimelineSlider;
