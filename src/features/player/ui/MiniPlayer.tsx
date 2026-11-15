import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  SkipNext,
  SkipPrevious,
  MaximizeSquare3,
  VolumeCross,
  VolumeSmall,
  VolumeLoud,
  Sidebar,
  AltArrowDown,
} from "@solar-icons/react";
import { HeartFill, HeartLine } from "@mingcute/react";

import {
  PlayerMorphIcon,
  ICON_PLAY,
  ICON_PAUSE,
} from "./morphPlayerIcons";

import { usePlayerState } from "../hooks/usePlayerState";
import { playerEngine } from "../engine/playerEngine";
import { useTranslation } from "@/languages";
import { useIsTrackLiked, useLikeTrack, useUnlikeTrack } from "@/features/library/hooks";
import { TimelineSlider, formatPlaybackTime } from "./TimelineSlider";
import { useTheme } from "next-themes";
import { useCoverReady, CoverImage } from "@/features/covers";
import { useCustomizationStore, getBlockStyle } from "@/features/settings";
import ExplicitBadge from "@/shared/ui/ExplicitBadge";
import { ArtistLink } from "@/features/artist";
import { toVolumeGain, toVolumeLevel } from "../engine/volume";
import { VolumePicker } from "./VolumePicker";

export interface MiniPlayerProps {
  onQueueOpenChange?: (open: boolean) => void;
  onQueueToggle?: () => void;
  onFullscreenOpen?: () => void;
  embedded?: boolean;
  isEdgeToEdge?: boolean;
}

function MiniPlayer({
  onQueueOpenChange,
  onQueueToggle,
  onFullscreenOpen,
}: MiniPlayerProps) {
  const player = usePlayerState();
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isLight =
    resolvedTheme
      ? resolvedTheme === "light"
      : typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light";

  const [isExpanded, setIsExpanded] = useState(false);

  const backgroundImage = useCustomizationStore((state) => state.backgroundImage);
  const miniplayerConfig = useCustomizationStore((state) => state.miniplayer);
  const hasCustomBg = Boolean(backgroundImage && !isLight);
  const miniplayerCustomStyle = getBlockStyle(miniplayerConfig, !isLight, hasCustomBg);

  const currentTrack = player.currentTrack;
  const isLiked = useIsTrackLiked(currentTrack?.id);
  const likeMutation = useLikeTrack();
  const unlikeMutation = useUnlikeTrack();
  const togglingRef = useRef(false);

  const handleLikeToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack || togglingRef.current) return;
    togglingRef.current = true;
    const onSettled = () => {
      togglingRef.current = false;
    };
    if (isLiked) {
      unlikeMutation.mutate(currentTrack.id, { onSettled });
    } else {
      likeMutation.mutate(currentTrack.id, { onSettled });
    }
  }, [currentTrack, isLiked, likeMutation, unlikeMutation]);

  const durationMs =
    player.durationMs > 0
      ? player.durationMs
      : (player.currentTrack?.durationMs ?? 0);

  const isPlaying = player.status === "playing";
  const isLoading = player.status === "loading";
  const trackTitle = player.currentTrack?.title ?? t("player.nothing_playing");
  const trackArtists =
    player.currentTrack?.artists ?? t("player.choose_track");

  const coverUrl = player.currentTrack?.coverUrl || "";
  const isCoverLoaded = useCoverReady(coverUrl);

  // Volume popover for expanded state
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const volumeToggleRef = useRef<HTMLButtonElement>(null);
  const volumePopupRef = useRef<HTMLDivElement>(null);
  const volumeHoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNonZeroVolumeRef = useRef<number>(0.7);
  const volumeLevel = toVolumeLevel(player.volume);

  const clearVolumeHoverTimer = useCallback(() => {
    if (volumeHoverCloseTimerRef.current) {
      clearTimeout(volumeHoverCloseTimerRef.current);
      volumeHoverCloseTimerRef.current = null;
    }
  }, []);

  const handleVolumeMouseLeave = useCallback(() => {
    clearVolumeHoverTimer();
    if (isVolumeDragging) return;
    volumeHoverCloseTimerRef.current = setTimeout(() => {
      setVolumeOpen(false);
    }, 150);
  }, [clearVolumeHoverTimer, isVolumeDragging]);

  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (volumeLevel > 0) {
      lastNonZeroVolumeRef.current = volumeLevel;
      playerEngine.setVolume(0);
    } else {
      const restore = lastNonZeroVolumeRef.current || 0.7;
      playerEngine.setVolume(toVolumeGain(restore));
    }
  }, [volumeLevel]);

  // Click handler on mini reproductor:
  // "al presionar cualquier parte del minireproductor (que no sea los botones de pausa, adelante y atrÃ¡s) se expanda"
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    // Do not toggle if click originated from interactive elements
    if (
      target.closest("[data-no-toggle]") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("a")
    ) {
      return;
    }
    setIsExpanded((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button") || target?.closest("input") || target?.closest("a")) {
        return;
      }
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  }, []);

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      onClick={handleContainerClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={isExpanded ? "Mini reproductor expandido" : "Mini reproductor compacto"}
      title={isExpanded ? "Haz clic para contraer" : "Haz clic para expandir"}
      className={`relative select-none overflow-hidden transition-colors cursor-pointer outline-none ${
        isExpanded
          ? "w-[580px] max-w-[calc(100vw-32px)] rounded-[26px] p-[10px]"
          : "w-[390px] max-w-[calc(100vw-32px)] h-[54px] rounded-full px-[10px] py-[7px]"
      } ${
        hasCustomBg
          ? "backdrop-blur-2xl bg-black/70 border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.65)]"
          : isLight
            ? "backdrop-blur-2xl bg-white/95 border border-black/10 shadow-[0_12px_36px_rgba(0,0,0,0.14)]"
            : "backdrop-blur-2xl bg-[#0e1612]/95 border border-white/10 dark:border-[var(--accent-primary,#00f59b)]/30 shadow-[0_16px_40px_rgba(0,0,0,0.65)]"
      }`}
      style={miniplayerCustomStyle}
    >
      {/* ================= COMPACT STATE (IMAGE 1) ================= */}
      {!isExpanded && (
        <motion.div
          key="compact-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex h-full w-full items-center justify-between gap-[10px]"
        >
          {/* Left: Album cover */}
          <div className="relative h-[40px] w-[40px] shrink-0 overflow-hidden rounded-[10px] bg-bg-elevated shadow-sm">
            <CoverImage
              key={coverUrl}
              src={coverUrl}
              alt={trackTitle}
              width={40}
              height={40}
              priority
              draggable={false}
              className={`h-[40px] w-[40px] object-cover rounded-[10px] ${
                coverUrl && !isCoverLoaded ? "animate-pulse" : ""
              }`}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/35 backdrop-blur-[0.5px] flex items-end justify-center gap-[2px] pb-[6px] pointer-events-none">
                <span className="spoplayer-eq-bar" />
                <span className="spoplayer-eq-bar" />
                <span className="spoplayer-eq-bar" />
              </div>
            )}
          </div>

          {/* Middle: Truncated Title & Artist */}
          <div className="flex flex-1 min-w-0 flex-col justify-center">
            <span
              className="truncate text-[13px] font-semibold text-text-primary leading-tight"
              title={trackTitle}
            >
              {trackTitle}
            </span>
            <span
              className="truncate text-[11px] font-normal text-text-tertiary leading-tight mt-[2px]"
              title={trackArtists}
            >
              {trackArtists}
            </span>
          </div>

          {/* Right: Controls (Previous, Play/Pause, Next) */}
          <div
            data-no-toggle="true"
            className="flex items-center gap-[6px] shrink-0 pointer-events-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Previous track"
              title="Anterior"
              data-no-toggle="true"
              className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none bg-transparent cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                void playerEngine.skipPrevious();
              }}
            >
              <SkipPrevious size={18} weight="Bold" />
            </button>

            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pausar" : "Reproducir"}
              data-no-toggle="true"
              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[var(--accent-primary,#00f59b)] text-black shadow-[0_0_14px_rgba(0,245,155,0.4)] hover:shadow-[0_0_20px_rgba(0,245,155,0.6)] hover:scale-105 active:scale-95 transition-all border-none cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                void playerEngine.togglePlayPause();
              }}
            >
              <span className="relative flex h-[16px] w-[16px] items-center justify-center">
                <span
                  className={`absolute inset-0 flex items-center justify-center ${
                    isLoading ? "opacity-0" : ""
                  } ${isPlaying ? "" : "translate-x-[0.5px]"}`}
                >
                  <PlayerMorphIcon
                    icon={isPlaying ? ICON_PAUSE : ICON_PLAY}
                    size={16}
                  />
                </span>
                {isLoading && (
                  <span
                    className="absolute h-[16px] w-[16px] animate-spin rounded-full border-[2px] border-current border-t-transparent"
                    aria-label="Cargando"
                  />
                )}
              </span>
            </button>

            <button
              type="button"
              aria-label="Next track"
              title="Siguiente"
              data-no-toggle="true"
              className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none bg-transparent cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                void playerEngine.skipNext();
              }}
            >
              <SkipNext size={18} weight="Bold" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ================= EXPANDED STATE (IMAGE 3) ================= */}
      {isExpanded && (
        <motion.div
          key="expanded-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col w-full"
        >
          {/* Top row: Cover (larger), Title & Artist (maximum space), Controls (larger) */}
          <div className="flex items-center gap-[14px] px-[6px] pt-[2px] pb-[8px]">
            {/* Larger Cover */}
            <div
              className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[14px] bg-bg-elevated shadow-md"
              title={trackTitle}
            >
              <CoverImage
                key={coverUrl}
                src={coverUrl}
                alt={trackTitle}
                width={58}
                height={58}
                priority
                draggable={false}
                className={`h-[58px] w-[58px] object-cover rounded-[14px] ${
                  coverUrl && !isCoverLoaded ? "animate-pulse" : ""
                }`}
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/35 backdrop-blur-[0.5px] flex items-end justify-center gap-[2.5px] pb-[8px] pointer-events-none">
                  <span className="spoplayer-eq-bar" />
                  <span className="spoplayer-eq-bar" />
                  <span className="spoplayer-eq-bar" />
                  <span className="spoplayer-eq-bar" />
                </div>
              )}
            </div>

            {/* Maximum Title & Artist Space */}
            <div className="flex flex-1 min-w-0 flex-col justify-center pr-2">
              <span
                className="truncate text-[16px] font-bold text-text-primary tracking-tight leading-tight"
                title={trackTitle}
              >
                {trackTitle}
              </span>
              <div className="truncate text-[13px] font-medium text-text-secondary leading-tight mt-[4px] flex items-center gap-[5px]">
                {player.currentTrack?.explicit && <ExplicitBadge />}
                <span title={trackArtists}>{trackArtists}</span>
              </div>
            </div>

            {/* Larger Control Buttons */}
            <div
              data-no-toggle="true"
              className="flex items-center gap-[8px] shrink-0 pointer-events-auto cursor-default"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Previous track"
                title="Anterior"
                data-no-toggle="true"
                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none bg-transparent cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  void playerEngine.skipPrevious();
                }}
              >
                <SkipPrevious size={22} weight="Bold" />
              </button>

              <button
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                title={isPlaying ? "Pausar" : "Reproducir"}
                data-no-toggle="true"
                className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[var(--accent-primary,#00f59b)] text-black shadow-[0_0_18px_rgba(0,245,155,0.45)] hover:shadow-[0_0_26px_rgba(0,245,155,0.65)] hover:scale-105 active:scale-95 transition-all border-none cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  void playerEngine.togglePlayPause();
                }}
              >
                <span className="relative flex h-[20px] w-[20px] items-center justify-center">
                  <span
                    className={`absolute inset-0 flex items-center justify-center ${
                      isLoading ? "opacity-0" : ""
                    } ${isPlaying ? "" : "translate-x-[0.5px]"}`}
                  >
                    <PlayerMorphIcon
                      icon={isPlaying ? ICON_PAUSE : ICON_PLAY}
                      size={20}
                    />
                  </span>
                  {isLoading && (
                    <span
                      className="absolute h-[20px] w-[20px] animate-spin rounded-full border-[2.5px] border-current border-t-transparent"
                      aria-label="Cargando"
                    />
                  )}
                </span>
              </button>

              <button
                type="button"
                aria-label="Next track"
                title="Siguiente"
                data-no-toggle="true"
                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none bg-transparent cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  void playerEngine.skipNext();
                }}
              >
                <SkipNext size={22} weight="Bold" />
              </button>

              {/* Utility buttons: Like, Fullscreen, Collapse */}
              <span className="mx-[2px] h-[20px] w-px bg-white/10 dark:bg-white/15" aria-hidden="true" />

              <button
                type="button"
                aria-label={isLiked ? "Unlike" : "Like"}
                title={isLiked ? "Quitar de favoritos" : "Guardar en favoritos"}
                data-no-toggle="true"
                className={`inline-flex h-[32px] w-[32px] items-center justify-center rounded-full transition-all border-none bg-transparent cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 ${
                  isLiked
                    ? "text-[var(--accent-primary,#00f59b)] drop-shadow-[0_0_8px_rgba(0,245,155,0.45)]"
                    : "text-text-secondary hover:text-text-primary"
                }`}
                onClick={handleLikeToggle}
              >
                {isLiked ? <HeartFill size={18} /> : <HeartLine size={18} />}
              </button>

              <button
                type="button"
                aria-label={t("player.open_player")}
                title="Pantalla completa"
                data-no-toggle="true"
                className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none bg-transparent cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onFullscreenOpen?.();
                }}
              >
                <MaximizeSquare3 size={18} weight="Outline" />
              </button>

              <button
                type="button"
                aria-label="Contraer"
                title="Contraer mini reproductor"
                data-no-toggle="true"
                className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none bg-transparent cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <AltArrowDown size={18} weight="Outline" />
              </button>
            </div>
          </div>

          {/* Bottom row: Playback line with timestamps [1:00 ~~~~~ 4:00] (IMAGE 3) */}
          <div
            data-no-toggle="true"
            className="flex items-center gap-[10px] px-[8px] pt-[2px] pb-[4px] w-full pointer-events-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] font-medium text-text-tertiary tabular-nums select-none shrink-0 min-w-[34px] text-right">
              {formatPlaybackTime(player.positionMs)}
            </span>

            <div className="flex-1 flex items-center h-[20px]">
              <TimelineSlider
                positionMs={player.positionMs}
                durationMs={durationMs}
                onSeek={(pos) => playerEngine.seek(pos)}
                size="sm"
                fillColor="var(--accent-primary, #00f59b)"
                trackBg={isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.16)"}
                trackActiveBg={isLight ? "rgba(0, 0, 0, 0.22)" : "rgba(255, 255, 255, 0.28)"}
                className="w-full"
                showThumb
                showTooltip
              />
            </div>

            <span className="text-[11px] font-medium text-text-tertiary tabular-nums select-none shrink-0 min-w-[34px] text-left">
              {formatPlaybackTime(durationMs)}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(MiniPlayer);
