import {
  useCallback,
  useEffect,
  createElement,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { shouldReleaseTopPin, startsPinnedToTop } from "./lyricsTopPin";
import { usePlayerState } from "../hooks/usePlayerState";
import { playerEngine } from "../engine/playerEngine";
import {
  useLyricsStore,
  LyricsProviderIsland,
  braccatoThemeCss,
  hasSyncedLyricsSources,
} from "@/features/lyrics";
import { AnimatePresence, motion } from "framer-motion";
import { PlayerUiElements } from "./PlayerUiElements";
import { DownLine, WaveLine, SparklesLine, TextLine } from "@mingcute/react";
import { preloadCoverArt, useCoverSrc } from "@/features/covers";
import { CinematicLyricsView } from "@/features/lyrics/ui/CinematicLyricsView";
import { useModalStore } from "@/features/library";
import { usePlayerStore } from "../store/playerStore";
import "@braccato/core/element";
import "@braccato/core/styles/variables.css";
import "@braccato/core/styles/lyrics.css";
import "@braccato/core/styles/instrumental.css";
import KawarpWrapper from "./KawarpWrapper";
import { useTranslation } from "@/languages";

const BRACCATO_TAG = "braccato-lyrics";
const KAWARP_FADE_IN_MS = 600;

interface BraccatoLyricsViewProps {
  lyrics: any[];
}

function BraccatoLyricsView({ lyrics }: BraccatoLyricsViewProps) {
  const player = usePlayerState();
  const elementRef = useRef<any>(null);
  const latestLyricsRef = useRef(lyrics);
  const freeScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWheelTimeRef = useRef(0);
  const isInFreeSearchRef = useRef(false);
  const waitingForAudioAfterClickRef = useRef(false);
  const pinnedToTopRef = useRef(startsPinnedToTop(player.status, player.positionMs));

  const scrollToActiveLine = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = elementRef.current;
      if (!el) return false;

      const activeEls = (el as HTMLElement).querySelectorAll<HTMLElement>(
        ".blyrics--active",
      );
      if (activeEls.length === 0) return false;
      const activeEl = activeEls[activeEls.length - 1];

      const containerRect = el.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      if (containerRect.height === 0 || elRect.height === 0) return false;

      const offset = elRect.top - containerRect.top + el.scrollTop;
      const targetScrollTop =
        offset - containerRect.height / 2 + elRect.height / 2;

      if (behavior === "auto") {
        el.scrollTop = Math.max(0, targetScrollTop);
      } else {
        el.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior,
        });
      }
      return true;
    },
    [],
  );

  const returnToFollowingMode = useCallback(() => {
    if (freeScrollTimerRef.current) {
      clearTimeout(freeScrollTimerRef.current);
      freeScrollTimerRef.current = null;
    }
    isInFreeSearchRef.current = false;
    lastWheelTimeRef.current = 0;

    const el = elementRef.current;
    if (!el) return;

    if (el.renderer) {
      el.renderer.resumeAutoscroll?.();
      const engine = (el.renderer as any)?.engine;
      if (engine) {
        engine.scrollResumeTime = 0;
        engine.nextScrollAllowedTime = 0;
        engine.queuedScroll = true;
      }
    }

    scrollToActiveLine("smooth");
  }, [scrollToActiveLine]);

  const returnToFollowingModeRef = useRef(returnToFollowingMode);
  returnToFollowingModeRef.current = returnToFollowingMode;

  const handleUserInteraction = useCallback(() => {
    pinnedToTopRef.current = false;
    lastWheelTimeRef.current = Date.now();
    isInFreeSearchRef.current = true;

    const el = elementRef.current;
    if (el?.renderer) {
      el.renderer.noteUserScroll?.();
      el.renderer.noteUserScroll?.();
      el.renderer.noteUserScroll?.();
    }

    if (freeScrollTimerRef.current) {
      clearTimeout(freeScrollTimerRef.current);
      freeScrollTimerRef.current = null;
    }

    freeScrollTimerRef.current = setTimeout(() => {
      const elapsed = Date.now() - lastWheelTimeRef.current;
      if (elapsed < 5900) return;

      returnToFollowingMode();
    }, 6000);
  }, [returnToFollowingMode]);

  const handleUserInteractionRef = useRef(handleUserInteraction);
  handleUserInteractionRef.current = handleUserInteraction;

  const setElement = useCallback((el: any) => {
    elementRef.current = el;
    if (!el) return;
    el.theme = braccatoThemeCss;
    el.lyrics = latestLyricsRef.current;
    el.source = "#spoplayer-audio";

    const handleBraccatoLineClick = (e: Event) => {
      const isAudioLoading = playerEngine.getSnapshot().status === "loading";
      if (isAudioLoading) {
        waitingForAudioAfterClickRef.current = true;
        isInFreeSearchRef.current = true;
        if (freeScrollTimerRef.current) {
          clearTimeout(freeScrollTimerRef.current);
          freeScrollTimerRef.current = null;
        }
        if (el.renderer) {
          el.renderer.noteUserScroll?.();
          el.renderer.noteUserScroll?.();
          el.renderer.noteUserScroll?.();
        }
      } else {
        returnToFollowingModeRef.current();
      }

      const detail = (e as CustomEvent).detail as
        | { timeS?: number; time?: number }
        | undefined;
      const timeMs =
        detail?.timeS !== undefined
          ? Math.round(detail.timeS * 1000)
          : detail?.time !== undefined
            ? detail.time > 1000
              ? Math.round(detail.time)
              : Math.round(detail.time * 1000)
            : null;
      if (timeMs !== null) {
        playerEngine.seek(timeMs, true);
      }
    };

    const onUserScroll = () => {
      handleUserInteractionRef.current();
    };

    const onLyricsLoaded = () => {
      if (waitingForAudioAfterClickRef.current) return;
      requestAnimationFrame(() => {
        if (!waitingForAudioAfterClickRef.current) {
          scrollToActiveLine("auto");
        }
      });
    };

    let syncRafId: number;
    let lastReportedIndex = -1;

    const checkActiveLine = () => {
      const audioEl = document.getElementById("spoplayer-audio") as HTMLAudioElement | null;
      if (audioEl && !Number.isNaN(audioEl.currentTime)) {
        const currentMs = audioEl.currentTime * 1000;
        const lines = useLyricsStore.getState().syncedLines;
        let idx = -1;
        for (let i = 0; i < lines.length; i++) {
          const prevEnd =
            i > 0 && lines[i - 1].words && lines[i - 1].words!.length > 0
              ? lines[i - 1].words![lines[i - 1].words!.length - 1].endMs
              : i > 0
                ? lines[i - 1].timeMs
                : 0;
          const targetEarlyMs = Math.max(prevEnd, lines[i].timeMs - 600);
          if (targetEarlyMs <= currentMs) {
            idx = i;
          } else {
            break;
          }
        }
        if (idx !== lastReportedIndex) {
          lastReportedIndex = idx;
          useLyricsStore.getState().setActiveLineIndex(idx >= 0 ? idx : null);
        }
      }
      syncRafId = requestAnimationFrame(checkActiveLine);
    };

    syncRafId = requestAnimationFrame(checkActiveLine);

    el.addEventListener("braccato:lyrics-loaded", onLyricsLoaded);
    el.addEventListener("braccato:line-click", handleBraccatoLineClick);
    el.addEventListener("wheel", onUserScroll, { passive: true, capture: true });
    el.addEventListener("touchmove", onUserScroll, { passive: true, capture: true });

    return () => {
      cancelAnimationFrame(syncRafId);
      useLyricsStore.getState().setActiveLineIndex(null);
      el.removeEventListener("braccato:lyrics-loaded", onLyricsLoaded);
      el.removeEventListener("braccato:line-click", handleBraccatoLineClick);
      el.removeEventListener("wheel", onUserScroll, { capture: true });
      el.removeEventListener("touchmove", onUserScroll, { capture: true });
      if (freeScrollTimerRef.current) {
        clearTimeout(freeScrollTimerRef.current);
        freeScrollTimerRef.current = null;
      }
      elementRef.current = null;
    };
  }, [scrollToActiveLine]);

  useEffect(() => {
    latestLyricsRef.current = lyrics;
    const element = elementRef.current;
    if (element) element.lyrics = lyrics;
  }, [lyrics]);

  useEffect(() => {
    if (
      (player.status === "playing" || player.status === "paused") &&
      waitingForAudioAfterClickRef.current
    ) {
      waitingForAudioAfterClickRef.current = false;
      returnToFollowingMode();
    }
  }, [player.status, returnToFollowingMode]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const checkAndScroll = () => {
      if (cancelled || waitingForAudioAfterClickRef.current || pinnedToTopRef.current) return;
      attempts++;
      const success = scrollToActiveLine("auto");
      if (!success && attempts < 30) {
        requestAnimationFrame(checkAndScroll);
      }
    };

    const rafId = requestAnimationFrame(checkAndScroll);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [lyrics, scrollToActiveLine]);

  useEffect(() => {
    if (!pinnedToTopRef.current) return;
    const startedAt = performance.now();
    let rafId = 0;
    const holdTop = () => {
      const el = elementRef.current as HTMLElement & { renderer?: { noteUserScroll?: () => void; resumeAutoscroll?: () => void } };
      if (!pinnedToTopRef.current) return;
      const audio = document.getElementById("spoplayer-audio") as HTMLAudioElement | null;
      const release = shouldReleaseTopPin({
        status: playerEngine.getSnapshot().status,
        audioPaused: !audio || audio.paused,
        audioTimeMs: (audio?.currentTime ?? 0) * 1000,
        pinnedForMs: performance.now() - startedAt,
      });
      if (release) {
        pinnedToTopRef.current = false;
        el?.renderer?.resumeAutoscroll?.();
        return;
      }
      if (el) {
        el.renderer?.noteUserScroll?.();
        if (el.scrollTop !== 0) el.scrollTop = 0;
      }
      rafId = requestAnimationFrame(holdTop);
    };
    rafId = requestAnimationFrame(holdTop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="relative flex flex-col flex-1 w-full h-full min-h-0">
      {createElement(BRACCATO_TAG, {
        ref: setElement,
        source: "#spoplayer-audio",
        className: "block flex-1 w-full h-full px-6",
        style: {
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
          scrollbarWidth: "none",
        },
      })}
    </div>
  );
}

export interface FullscreenPlayerProps {
  effectsReady?: boolean;
  onClose: () => void;
}

export function FullscreenPlayer({
  effectsReady = true,
  onClose,
}: FullscreenPlayerProps) {
  const { t } = useTranslation();
  const player = usePlayerState();
  const coverUrl = player.currentTrack?.coverUrl;
  const kawarpSrc = useCoverSrc(coverUrl);

  useEffect(() => {
    if (!player.currentTrack) {
      onClose();
    }
  }, [player.currentTrack, onClose]);

  const {
    braccatoLyrics,
    rawFormat,
    lyricsLoading,
    lyricsError,
    plainLyrics,
    activeProvider,
    availableProviders,
    currentLyricsTrackId,
  } = useLyricsStore();

  const onError = useCallback((err: Error) => {
    console.error("kawarp load error:", err);
  }, []);

  const [kawarpShown, setKawarpShown] = useState(false);
  const onKawarpLoad = useCallback(() => {
    setTimeout(() => setKawarpShown(true), KAWARP_FADE_IN_MS);
  }, []);

  const nextCoverUrl = player.queue[player.currentIndex + 1]?.coverUrl;
  useEffect(() => {
    void preloadCoverArt(coverUrl);
    void preloadCoverArt(nextCoverUrl);
  }, [coverUrl, nextCoverUrl]);

  const currentTrackId = player.currentTrack?.id;
  const isMatchingTrack = Boolean(currentTrackId && currentLyricsTrackId === currentTrackId);
  const hasLyrics = isMatchingTrack && braccatoLyrics.length > 0;
  const lyricsViewMode = usePlayerStore((s) => s.lyricsViewMode);
  const toggleLyricsViewMode = usePlayerStore((s) => s.toggleLyricsViewMode);
  const openZenVisualizer = useModalStore((s) => s.openZenVisualizer);

  const hasSyncedSources = hasSyncedLyricsSources(
    availableProviders,
    braccatoLyrics,
    rawFormat,
  );
  const showProviderIsland =
    hasLyrics && (hasSyncedSources || availableProviders.length > 1);
  const isInstrumental =
    isMatchingTrack &&
    !lyricsLoading &&
    !hasLyrics &&
    !lyricsError &&
    plainLyrics === "[INSTRUMENTAL]";

  return (
    <div
      data-theme="dark"
      className="dark relative h-full w-full overflow-hidden bg-black text-white"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: "var(--color-bg-primary)" }}
        />
        {kawarpSrc && !kawarpShown && (
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-110 opacity-70 pointer-events-none"
            style={{ backgroundImage: `url(${kawarpSrc})` }}
          />
        )}
        {effectsReady ? (
          <KawarpWrapper src={kawarpSrc} onLoad={onKawarpLoad} onError={onError} />
        ) : null}
      </div>

      <div className="absolute inset-0 z-[1] bg-black/40" />

      <div className="absolute inset-0 z-10 flex">
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <PlayerUiElements onClose={onClose} />
        </div>

        <div className="flex-1 h-full min-h-0 pl-2 pr-6 flex flex-col relative">
          {/* Top Bar: Lyrics Provider, Sync Adjuster, View Mode & Zen Visualizer */}
          {/* pr-[140px] provides a generous safe margin so controls are NEVER under or obscured by the window control buttons */}
          <div className="w-full pt-3 pb-2 pl-1 pr-[140px] flex items-center justify-between gap-3 shrink-0 z-30 pointer-events-auto">
            {/* Left: Selección de proveedor y Ajuste de desfase */}
            <div className="flex items-center gap-2 min-w-0">
              {showProviderIsland ? <LyricsProviderIsland /> : <div />}
            </div>

            {/* Right: Modo de letra y Visualizador Zen */}
            <div className="flex items-center gap-2 shrink-0">
              {hasLyrics && (
                <button
                  type="button"
                  onClick={toggleLyricsViewMode}
                  className={`flex items-center gap-1.5 h-[32px] px-3 rounded-lg text-xs font-semibold backdrop-blur-xl border transition-all cursor-pointer select-none active:scale-95 ${
                    lyricsViewMode === "cinematic"
                      ? "bg-[var(--accent-primary,#00f59b)]/15 border-[var(--accent-primary,#00f59b)]/35 text-[var(--accent-primary,#00f59b)] shadow-[0_0_12px_rgba(0,245,155,0.2)]"
                      : "bg-black/50 hover:bg-black/70 border-white/10 text-white/80 hover:text-white"
                  }`}
                  title="Alternar entre modo Cinemático y modo Estándar (C)"
                >
                  {lyricsViewMode === "cinematic" ? (
                    <>
                      <SparklesLine size={14} className="text-[var(--accent-primary,#00f59b)] shrink-0" />
                      <span>Modo Cinemático</span>
                    </>
                  ) : (
                    <>
                      <TextLine size={14} className="text-white/70 shrink-0" />
                      <span>Modo Estándar</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={openZenVisualizer}
                className="flex items-center gap-1.5 h-[32px] px-3 rounded-lg text-xs font-medium bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/10 text-white/85 hover:text-[var(--accent-primary,#00f59b)] hover:border-[var(--accent-primary,#00f59b)]/30 transition-all cursor-pointer select-none active:scale-95"
                title="Abrir Visualizador Zen Reactivo a pantalla completa (V)"
              >
                <WaveLine size={14} className="text-[var(--accent-primary,#00f59b)] shrink-0" />
                <span>Modo Zen</span>
              </button>
            </div>
          </div>

          <div
            className="flex-1 min-h-0 relative w-full h-full"
            style={{
              display: hasLyrics ? "flex" : "none",
            }}
          >
            <AnimatePresence initial={false}>
              {hasLyrics && (
                <motion.div
                  key={`lyrics-${currentTrackId}-${lyricsViewMode}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, pointerEvents: "none" }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="absolute inset-0 flex flex-col"
                >
                  {lyricsViewMode === "cinematic" ? (
                    <CinematicLyricsView />
                  ) : (
                    <BraccatoLyricsView lyrics={braccatoLyrics} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {!hasLyrics && lyricsLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <div className="flex flex-col gap-5 w-full max-w-[500px]">
                  {[80, 65, 45, 70, 55, 85, 60, 50, 75, 40, 65, 55].map(
                    (w, i) => (
                      <div
                        key={i}
                        className="h-5 rounded animate-pulse bg-border-alpha-14"
                        style={{ width: `${w}%` }}
                      />
                    ),
                  )}
                </div>
              </motion.div>
            ) : !hasLyrics && isInstrumental ? (
              <motion.div
                key="instrumental"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 flex items-center justify-center text-text-tertiary text-lg"
              >
                <span>{t("player.instrumental")}</span>
              </motion.div>
            ) : !hasLyrics ? (
              <motion.div
                key="empty-or-ai"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 overflow-y-auto py-8 px-6"
              >
                {lyricsError ? (
                  <div className="flex items-center justify-center h-full text-text-tertiary text-[15px]">
                    {lyricsError}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-80 text-text-tertiary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="6" cy="18" r="3"></circle>
                      <circle cx="18" cy="16" r="3"></circle>
                      <line x1="2" y1="2" x2="22" y2="22"></line>
                    </svg>
                    <span className="text-[15px] font-[400] max-w-[250px] text-center" style={{ lineHeight: "1.4" }}>
                      {t("player.no_lyrics_found")}
                    </span>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Top Left Navigation Dock: Close Fullscreen & Zen Mode */}
      <div className="absolute top-[12px] left-[12px] z-30 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          aria-label={t("player.close_fullscreen")}
          onClick={onClose}
          data-no-window-drag
          className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-lg border border-white/10 bg-black/50 backdrop-blur-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-[0.94] transition-all cursor-pointer select-none"
        >
          <DownLine size={18} />
        </button>

        <button
          type="button"
          onClick={openZenVisualizer}
          data-no-window-drag
          className="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-lg text-xs font-semibold bg-black/50 hover:bg-black/75 backdrop-blur-xl border border-white/10 text-white/90 hover:text-[var(--accent-primary,#00f59b)] hover:border-[var(--accent-primary,#00f59b)]/35 active:scale-95 transition-all cursor-pointer select-none shadow-sm"
          title="Abrir Visualizador Zen Reactivo a pantalla completa (V)"
        >
          <WaveLine size={14} className="text-[var(--accent-primary,#00f59b)] shrink-0" />
          <span>Modo Zen</span>
        </button>
      </div>
    </div>
  );
}

export default function PlayerPage() {
  const navigate = useNavigate();
  return <FullscreenPlayer onClose={() => navigate(-1)} />;
}
