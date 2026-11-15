import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "@/languages";
import { motion, AnimatePresence } from "framer-motion";
import {
  SkipNext,
  SkipPrevious,
} from "@solar-icons/react";
import {
  PlayerMorphIcon,
  ICON_PLAY,
  ICON_PAUSE,
} from "@/features/player/ui/morphPlayerIcons";
import CoverImage from "@/features/covers/ui/CoverImage";
import { ScrollableText } from "@/shared/ui/ScrollableText";
import { useDisableButtonFocus } from "@/features/navigation/hooks/useDisableButtonFocus";
import { getAuthSession } from "@/shared/api/auth-session";
import type { OverlayAction, OverlayStatePayload } from "../contracts";
import {
  useCustomizationStore,
  loadPersistedWallpaper,
  DEFAULT_GLASS_CONFIG,
} from "@/features/settings/store/customizationStore";
import { useShortcutsStore } from "@/features/shortcuts/store/shortcutsStore";
import { matchesShortcut } from "@/features/shortcuts/utils/shortcutMatching";

const OVERLAY_CARD_TRANSITION = {
  duration: 0.12,
  ease: [0.16, 1, 0.3, 1],
} as const;

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function OverlayPlayer() {
  useDisableButtonFocus();
  const { t } = useTranslation();

  const [state, setState] = useState<OverlayStatePayload>({
    status: "idle",
    track: null,
    positionMs: 0,
    durationMs: 0,
    volume: 1,
    isLiked: false,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isInfoHovered, setIsInfoHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const anchorPosRef = useRef(state.positionMs);
  const anchorTimeRef = useRef(performance.now());
  const [interpolatedPosMs, setInterpolatedPosMs] = useState(state.positionMs);
  const lastTrackIdRef = useRef<string | null>(null);

  // Drag vs Click detection for overlay window
  const dragStartPosRef = useRef<{ screenX: number; screenY: number } | null>(null);
  const isDraggingRef = useRef(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      window.spoplayerElectron?.setOverlayExpanded?.(next);
      return next;
    });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-no-toggle]") || target?.closest("button") || target?.closest("input")) {
      return;
    }
    dragStartPosRef.current = { screenX: e.screenX, screenY: e.screenY };
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartPosRef.current) return;
    const deltaX = e.screenX - dragStartPosRef.current.screenX;
    const deltaY = e.screenY - dragStartPosRef.current.screenY;
    if (!isDraggingRef.current && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      isDraggingRef.current = true;
    }
    if (isDraggingRef.current) {
      dragStartPosRef.current = { screenX: e.screenX, screenY: e.screenY };
      window.spoplayerElectron?.moveOverlayBy?.(deltaX, deltaY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartPosRef.current) return;
    const wasDragging = isDraggingRef.current;
    dragStartPosRef.current = null;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (!wasDragging) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-no-toggle]") || target?.closest("button") || target?.closest("input")) {
        return;
      }
      toggleExpanded();
    }
  };

  useEffect(() => {
    if (!getAuthSession()) {
      window.spoplayerElectron?.closeOverlay?.();
      return;
    }

    window.spoplayerElectron?.getOverlayInitialState?.().then((initial) => {
      if (initial) {
        anchorPosRef.current = initial.positionMs;
        anchorTimeRef.current = performance.now();
        setInterpolatedPosMs(initial.positionMs);
        setState(initial);
      }
    });

    if (window.spoplayerElectron?.onOverlayState) {
      const cleanupState = window.spoplayerElectron.onOverlayState((newState) => {
        setState(newState);
      });
      return cleanupState;
    }
  }, []);

  useEffect(() => {
    const signal = setTimeout(() => window.spoplayerElectron?.overlayReady?.(), 0);
    return () => clearTimeout(signal);
  }, []);

  useEffect(() => {
    if (!window.spoplayerElectron?.onOverlayVisibility) return;
    const cleanupVisibility = window.spoplayerElectron.onOverlayVisibility((visible) => {
      setIsVisible(visible);
      if (!visible) {
        setIsExpanded(false);
      }
    });
    return cleanupVisibility;
  }, []);

  const sendAction = useCallback((action: OverlayAction) => {
    window.spoplayerElectron?.sendOverlayAction?.(action);
  }, []);

  const isPlaying = state.status === "playing";
  const durationMs = Math.max(1, state.durationMs || state.track?.durationMs || 1);

  useEffect(() => {
    if (state.track?.id !== lastTrackIdRef.current) {
      lastTrackIdRef.current = state.track?.id ?? null;
      setInterpolatedPosMs(state.positionMs);
      anchorPosRef.current = state.positionMs;
      anchorTimeRef.current = performance.now();
      return;
    }

    if (state.status === "paused") {
      const pos = state.positionMs > 0 ? state.positionMs : interpolatedPosMs;
      setInterpolatedPosMs(pos);
      anchorPosRef.current = pos;
      anchorTimeRef.current = performance.now();
      return;
    }

    if (state.positionMs > 0 || interpolatedPosMs === 0) {
      setInterpolatedPosMs(state.positionMs);
      anchorPosRef.current = state.positionMs;
      anchorTimeRef.current = performance.now();
    }
  }, [state.positionMs, state.status, state.track?.id]);

  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;

    const step = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(step);
        return;
      }
      const elapsed = performance.now() - anchorTimeRef.current;
      const current = Math.min(durationMs, anchorPosRef.current + elapsed);
      setInterpolatedPosMs(current);
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animId);
      const elapsed = performance.now() - anchorTimeRef.current;
      anchorPosRef.current = Math.min(durationMs, anchorPosRef.current + elapsed);
      anchorTimeRef.current = performance.now();
    };
  }, [isPlaying, durationMs]);

  const currentPosMs = interpolatedPosMs;
  const progressRatio = Math.min(1, Math.max(0, currentPosMs / durationMs));

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const targetMs = Math.round(ratio * durationMs);
    setInterpolatedPosMs(targetMs);
    anchorPosRef.current = targetMs;
    anchorTimeRef.current = performance.now();
    sendAction({ type: "seek", payload: { positionMs: targetMs } });
  };

  const backgroundImage = useCustomizationStore((s) => s.backgroundImage);
  const backgroundBlur = useCustomizationStore((s) => s.backgroundBlur);
  const backgroundDim = useCustomizationStore((s) => s.backgroundDim);
  const contentViewConfig = useCustomizationStore((s) => s.contentView);
  const miniplayerConfig = useCustomizationStore((s) => s.miniplayer);
  const hasCustomBg = Boolean(backgroundImage);

  const activeBlockConfig =
    (miniplayerConfig && (miniplayerConfig.opacity < 100 || miniplayerConfig.blur > 0 || miniplayerConfig.dim > 0))
      ? miniplayerConfig
      : (contentViewConfig && (contentViewConfig.opacity < 100 || contentViewConfig.blur > 0 || contentViewConfig.dim > 0))
        ? contentViewConfig
        : DEFAULT_GLASS_CONFIG;

  const alpha = Math.min(0.92, (activeBlockConfig?.opacity ?? 70) / 100);
  const dimAlpha = (activeBlockConfig?.dim ?? 15) / 100;
  const blurPx = activeBlockConfig?.blur ?? 24;

  const tintBackground = dimAlpha > 0
    ? `linear-gradient(rgba(0, 0, 0, ${dimAlpha}), rgba(0, 0, 0, ${dimAlpha})), rgba(12, 12, 14, ${alpha})`
    : `rgba(12, 12, 14, ${alpha})`;

  useEffect(() => {
    void loadPersistedWallpaper().then((img) => {
      if (img) {
        useCustomizationStore.setState({ backgroundImage: img });
      }
    });
  }, []);

  // Keyboard Shortcuts (Miniplayer mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const { miniplayer } = useShortcutsStore.getState();

      if (matchesShortcut(e, miniplayer.volumeUp)) {
        e.preventDefault();
        sendAction({ type: "volumeUp" });
        return;
      }

      if (matchesShortcut(e, miniplayer.volumeDown)) {
        e.preventDefault();
        sendAction({ type: "volumeDown" });
        return;
      }

      if (matchesShortcut(e, miniplayer.focusMainWindow)) {
        e.preventDefault();
        sendAction({ type: "focusMainWindow" });
        return;
      }

      if (matchesShortcut(e, miniplayer.playPause)) {
        e.preventDefault();
        sendAction({ type: "togglePlay" });
        return;
      }

      if (matchesShortcut(e, miniplayer.seekBackward)) {
        e.preventDefault();
        sendAction({ type: "seek", payload: { positionMs: Math.max(0, currentPosMs - 5000) } });
        return;
      }

      if (matchesShortcut(e, miniplayer.seekForward)) {
        e.preventDefault();
        sendAction({ type: "seek", payload: { positionMs: Math.min(durationMs, currentPosMs + 5000) } });
        return;
      }

      if (matchesShortcut(e, miniplayer.likeTrack)) {
        e.preventDefault();
        sendAction({ type: "like" });
        return;
      }

      if (matchesShortcut(e, miniplayer.prevTrack)) {
        e.preventDefault();
        sendAction({ type: "prev" });
        return;
      }

      if (matchesShortcut(e, miniplayer.nextTrack)) {
        e.preventDefault();
        sendAction({ type: "next" });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPosMs, durationMs, sendAction, state.volume]);

  return (
    <div
      className="flex h-screen w-screen select-none flex-col justify-start bg-transparent antialiased overflow-hidden font-sans p-1 m-0 border-0"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          const target = e.target as HTMLElement | null;
          if (target?.closest("button") || target?.closest("input")) return;
          e.preventDefault();
          toggleExpanded();
        }
      }}
      tabIndex={0}
      role="region"
      aria-label={isExpanded ? "Mini reproductor flotante expandido" : "Mini reproductor flotante"}
      title={isExpanded ? "Clic para contraer • Arrastrar para mover" : "Clic para expandir • Arrastrar para mover"}
      style={{ cursor: "grab" }}
    >
      {/* ── Main Overlay Card ── */}
      <motion.div
        layout
        transition={OVERLAY_CARD_TRANSITION}
        className={`relative flex w-full shrink-0 flex-col overflow-hidden bg-[#0d0d10] border border-white/10 dark:border-[var(--accent-primary,#00f59b)]/30 shadow-[0_12px_36px_rgba(0,0,0,0.65)] ${
          isExpanded ? "h-[96px] rounded-[18px] p-2.5" : "h-[48px] rounded-full px-2 py-1.5"
        }`}
        style={{
          willChange: "transform, opacity",
          transformOrigin: "center center",
          opacity: isVisible ? 1 : 0,
        }}
      >
        {/* Wallpaper background */}
        {hasCustomBg && backgroundImage && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute inset-0 bg-[#0d0d10]" />
            <img
              src={backgroundImage}
              alt=""
              className="h-full w-full object-cover select-none"
              style={{
                filter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined,
                transform: backgroundBlur > 0 ? "scale(1.12)" : undefined,
              }}
            />
            {backgroundDim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: backgroundDim / 100 }} />}
            <div
              className="absolute inset-0"
              style={{
                background: tintBackground,
                backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
              }}
            />
          </div>
        )}

        {/* ================= COMPACT STATE (IMAGE 1) ================= */}
        {!isExpanded && (
          <div className="relative z-[2] flex h-full w-full items-center justify-between gap-2">
            {/* Left: Artwork */}
            <div className="relative h-[34px] w-[34px] shrink-0 overflow-hidden rounded-[8px] bg-[#16161a] shadow-sm">
              {state.track?.coverUrl || state.track?.cover ? (
                <CoverImage
                  key={state.track.coverUrl || state.track.cover}
                  src={state.track.coverUrl || state.track.cover || ""}
                  alt={state.track?.title || "Artwork"}
                  fill
                  sizes="34px"
                  priority
                  unoptimized
                  draggable={false}
                  className="rounded-[8px] object-cover pointer-events-none select-none"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[12px] text-white/30 select-none">
                  ♪
                </div>
              )}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/35 backdrop-blur-[0.5px] flex items-end justify-center gap-[2px] pb-[5px] pointer-events-none">
                  <span className="spoplayer-eq-bar" />
                  <span className="spoplayer-eq-bar" />
                  <span className="spoplayer-eq-bar" />
                </div>
              )}
            </div>

            {/* Middle: Short Title & Artist */}
            <div
              className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden pr-1"
              onMouseEnter={() => setIsInfoHovered(true)}
              onMouseLeave={() => setIsInfoHovered(false)}
            >
              <ScrollableText
                text={state.track?.title || t("player.nothing_playing")}
                isParentHovered={isInfoHovered}
                className="text-[12px] font-semibold leading-[15px] text-white tracking-tight truncate"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              />
              <ScrollableText
                text={state.track?.artist || t("player.choose_track")}
                isParentHovered={isInfoHovered}
                className="mt-[1px] text-[10px] font-normal leading-[13px] text-white/55 truncate"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              />
            </div>

            {/* Right: Controls Only (Previous, Play/Pause, Next) - NO Heart button in compact mode */}
            <div
              data-no-toggle="true"
              className="flex items-center gap-[4px] shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                tabIndex={-1}
                data-no-toggle="true"
                onClick={(e) => {
                  e.stopPropagation();
                  sendAction({ type: "prev" });
                }}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-0 bg-transparent text-white/70 hover:text-white hover:bg-white/10 active:scale-90 transition-all outline-none cursor-pointer"
                aria-label="Previous"
                title="Anterior"
              >
                <SkipPrevious size={16} weight="Bold" />
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-no-toggle="true"
                onClick={(e) => {
                  e.stopPropagation();
                  sendAction({ type: "togglePlay" });
                }}
                className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--accent-primary,#00f59b)] text-black shadow-[0_0_12px_rgba(0,245,155,0.4)] hover:shadow-[0_0_16px_rgba(0,245,155,0.6)] hover:scale-105 active:scale-95 transition-all border-none cursor-pointer"
                aria-label={isPlaying ? "Pause" : "Play"}
                title={isPlaying ? "Pausar" : "Reproducir"}
              >
                <span
                  className={`flex items-center justify-center transition-transform ${
                    isPlaying ? "" : "translate-x-[0.5px]"
                  }`}
                >
                  <PlayerMorphIcon
                    icon={isPlaying ? ICON_PAUSE : ICON_PLAY}
                    size={15}
                  />
                </span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-no-toggle="true"
                onClick={(e) => {
                  e.stopPropagation();
                  sendAction({ type: "next" });
                }}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-0 bg-transparent text-white/70 hover:text-white hover:bg-white/10 active:scale-90 transition-all outline-none cursor-pointer"
                aria-label="Next"
                title="Siguiente"
              >
                <SkipNext size={16} weight="Bold" />
              </button>
            </div>
          </div>
        )}

        {/* ================= EXPANDED STATE (IMAGE 3) ================= */}
        {isExpanded && (
          <div className="relative z-[2] flex h-full w-full flex-col justify-between">
            {/* Top row: Larger Cover, Maximum Title/Artist, Larger Controls */}
            <div className="flex items-center gap-3 w-full">
              {/* Larger Artwork */}
              <div className="relative h-[48px] w-[48px] shrink-0 overflow-hidden rounded-[10px] bg-[#16161a] shadow-md">
                {state.track?.coverUrl || state.track?.cover ? (
                  <CoverImage
                    key={state.track.coverUrl || state.track.cover}
                    src={state.track.coverUrl || state.track.cover || ""}
                    alt={state.track?.title || "Artwork"}
                    fill
                    sizes="48px"
                    priority
                    unoptimized
                    draggable={false}
                    className="rounded-[10px] object-cover pointer-events-none select-none"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[16px] text-white/30 select-none">
                    ♪
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/35 backdrop-blur-[0.5px] flex items-end justify-center gap-[2px] pb-[6px] pointer-events-none">
                    <span className="spoplayer-eq-bar" />
                    <span className="spoplayer-eq-bar" />
                    <span className="spoplayer-eq-bar" />
                  </div>
                )}
              </div>

              {/* Maximum Title & Artist */}
              <div
                className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden pr-2"
                onMouseEnter={() => setIsInfoHovered(true)}
                onMouseLeave={() => setIsInfoHovered(false)}
              >
                <ScrollableText
                  text={state.track?.title || t("player.nothing_playing")}
                  isParentHovered={isInfoHovered}
                  className="text-[14px] font-bold leading-[17px] text-white tracking-tight truncate"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                />
                <ScrollableText
                  text={state.track?.artist || t("player.choose_track")}
                  isParentHovered={isInfoHovered}
                  className="mt-[2px] text-[11px] font-medium leading-[14px] text-white/60 truncate"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                />
              </div>

              {/* Larger Controls */}
              <div
                data-no-toggle="true"
                className="flex items-center gap-[6px] shrink-0"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  data-no-toggle="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendAction({ type: "prev" });
                  }}
                  className="flex h-[32px] w-[32px] items-center justify-center rounded-full border-0 bg-transparent text-white/70 hover:text-white hover:bg-white/10 active:scale-90 transition-all outline-none cursor-pointer"
                  aria-label="Previous"
                  title="Anterior"
                >
                  <SkipPrevious size={20} weight="Bold" />
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-no-toggle="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendAction({ type: "togglePlay" });
                  }}
                  className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[var(--accent-primary,#00f59b)] text-black shadow-[0_0_16px_rgba(0,245,155,0.45)] hover:shadow-[0_0_22px_rgba(0,245,155,0.65)] hover:scale-105 active:scale-95 transition-all border-none cursor-pointer"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  title={isPlaying ? "Pausar" : "Reproducir"}
                >
                  <span
                    className={`flex items-center justify-center transition-transform ${
                      isPlaying ? "" : "translate-x-[0.5px]"
                    }`}
                  >
                    <PlayerMorphIcon
                      icon={isPlaying ? ICON_PAUSE : ICON_PLAY}
                      size={18}
                    />
                  </span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-no-toggle="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendAction({ type: "next" });
                  }}
                  className="flex h-[32px] w-[32px] items-center justify-center rounded-full border-0 bg-transparent text-white/70 hover:text-white hover:bg-white/10 active:scale-90 transition-all outline-none cursor-pointer"
                  aria-label="Next"
                  title="Siguiente"
                >
                  <SkipNext size={20} weight="Bold" />
                </button>
              </div>
            </div>

            {/* Bottom row: Playback Line with Timestamps [1:00 ~~~~~ 4:00] (IMAGE 3) */}
            <div
              data-no-toggle="true"
              className="flex items-center gap-2 w-full pt-1 pb-0.5"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] font-medium text-white/50 tabular-nums shrink-0 min-w-[28px] text-right">
                {formatTime(currentPosMs)}
              </span>

              {/* Interactive Timeline Track */}
              <div
                className="relative flex-1 h-[14px] flex items-center cursor-pointer group"
                onClick={handleSeek}
              >
                <div className="h-[3px] group-hover:h-[5px] w-full bg-white/20 rounded-full overflow-hidden relative transition-all duration-150">
                  <div
                    className="h-full bg-[var(--accent-primary,#00f59b)] transition-[width] duration-100 ease-linear rounded-full"
                    style={{ width: `${progressRatio * 100}%` }}
                  />
                </div>
                {/* Glowing Thumb on hover */}
                <div
                  className="absolute h-[10px] w-[10px] -ml-[5px] rounded-full bg-white shadow-[0_0_8px_rgba(0,245,155,0.8)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `${progressRatio * 100}%` }}
                />
              </div>

              <span className="text-[10px] font-medium text-white/50 tabular-nums shrink-0 min-w-[28px] text-left">
                {formatTime(durationMs)}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default OverlayPlayer;
