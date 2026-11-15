import { useTranslation } from "@/languages";
import { LuMinus, LuSquare, LuX } from "react-icons/lu";
import { useIsContentTransparent } from "@/features/settings/store/customizationStore";
import { useWindowState } from "../hooks/useWindowState";
import { useWindowAnimationStore } from "@/shared/ui";

export interface WindowControlsProps {
  className?: string;
  variant?: "default" | "glass" | "island";
  style?: React.CSSProperties;
  isFullscreen?: boolean;
}

// the window goes away right under the cursor (minimize / into the overlay), so
// chromium never sees the pointer leave and the button keeps its hover look when the
// window comes back. while this flag is on the control buttons drop their hover
// highlight; it clears on the first real mouse move after the window is back.
function suppressStaleHover() {
  const root = document.documentElement;
  root.setAttribute("data-hover-reset", "");
  (document.activeElement as HTMLElement | null)?.blur?.();
  let wentAway = false;
  const clear = () => root.removeAttribute("data-hover-reset");
  const onAway = () => {
    wentAway = true;
  };
  const onBack = () => {
    if (!wentAway) return;
    window.removeEventListener("blur", onAway);
    window.removeEventListener("focus", onBack);
    document.removeEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", clear, { once: true });
  };
  const onVisibility = () => (document.hidden ? onAway() : onBack());
  window.addEventListener("blur", onAway);
  window.addEventListener("focus", onBack);
  document.addEventListener("visibilitychange", onVisibility);
}

export default function WindowControls({
  className = "",
  variant = "default",
  style,
  isFullscreen = false,
}: WindowControlsProps) {
  const { t } = useTranslation();
  const { isFullScreen: isWindowFullScreen, isMaximized: isWindowMaximized } = useWindowState();

  const isHyprland = window.spoplayerElectron?.isHyprland ?? false;

  const handleMinimize = () => {
    // macos fullscreen spaces and hyprland tiling wm prohibit/ignore minimizing
    if (isWindowFullScreen || isHyprland) return;
    suppressStaleHover();
    useWindowAnimationStore.getState().triggerMinimize();
  };

  const handleMaximize = () => {
    window.spoplayerElectron?.toggleMaximize();
  };

  const handleClose = () => {
    useWindowAnimationStore.getState().triggerClose();
  };

  const isDarkMode = isFullscreen;
  const isMinimizeDisabled = isWindowFullScreen || isHyprland;
  const hasCustomBg = useIsContentTransparent();
  const isGlass = hasCustomBg || variant === "glass";

  return (
    <div
      style={style}
      className={`absolute top-0 right-0 z-[80] flex items-center justify-end pointer-events-none select-none ${className}`.trim()}
    >
      <div
        data-no-window-drag
        data-no-tooltip="true"
        data-window-controls
        className={`flex items-center h-[32px] min-h-[32px] max-h-[32px] box-border border-b border-l border-black/10 dark:border-white/10 pointer-events-auto transition-colors ${
          isFullscreen
            ? "bg-black/80 text-white border-white/10"
            : isGlass
              ? "bg-bg-panel/85 dark:bg-black/60 backdrop-blur-xl text-text-primary border-black/10 dark:border-white/10"
              : isDarkMode
                ? "bg-black/80 text-white backdrop-blur-xl border-white/10"
                : "bg-bg-panel text-text-primary border-border-primary/50"
        }`}
      >
        <button
          type="button"
          onClick={isMinimizeDisabled ? undefined : handleMinimize}
          disabled={isMinimizeDisabled}
          aria-disabled={isMinimizeDisabled}
          data-no-tooltip="true"
          className={`flex items-center justify-center w-[46px] h-[32px] min-w-[46px] min-h-[32px] max-h-[32px] border-r border-black/10 dark:border-white/10 border-t-0 border-b-0 border-l-0 bg-transparent transition-colors ${
            isMinimizeDisabled
              ? "opacity-30 cursor-not-allowed pointer-events-none"
              : isFullscreen
                ? "text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 cursor-pointer"
                : isGlass
                  ? "text-text-primary hover:bg-black/10 dark:hover:bg-white/10 active:bg-black/20 dark:active:bg-white/20 cursor-pointer"
                  : isDarkMode
                    ? "text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 cursor-pointer"
                    : "text-text-primary hover:bg-black/[0.08] dark:hover:bg-white/[0.12] active:bg-black/[0.15] cursor-pointer"
          }`}
          aria-label="Minimize"
        >
          <LuMinus size={14} />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          data-no-tooltip="true"
          className={`flex items-center justify-center w-[46px] h-[32px] min-w-[46px] min-h-[32px] max-h-[32px] border-r border-black/10 dark:border-white/10 border-t-0 border-b-0 border-l-0 cursor-pointer bg-transparent transition-colors ${
            isFullscreen
              ? "text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20"
              : isGlass
                ? "text-text-primary hover:bg-black/10 dark:hover:bg-white/10 active:bg-black/20 dark:active:bg-white/20"
                : isDarkMode
                  ? "text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20"
                  : "text-text-primary hover:bg-black/[0.08] dark:hover:bg-white/[0.12] active:bg-black/[0.15]"
          }`}
          aria-label={
            isWindowFullScreen
              ? t("common.exitFullscreen")
              : isWindowMaximized
                ? t("common.restore")
                : t("common.maximize")
          }
        >
          {isWindowMaximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2.5 8.5H1.5V1.5H8.5V2.5" />
              <rect x="3.5" y="3.5" width="6" height="6" rx="0.5" />
            </svg>
          ) : (
            <LuSquare size={11} />
          )}
        </button>
        <button
          type="button"
          onClick={handleClose}
          data-no-tooltip="true"
          className={`flex items-center justify-center w-[46px] h-[32px] min-w-[46px] min-h-[32px] max-h-[32px] cursor-pointer border-none bg-transparent transition-colors hover:bg-[#E81123] hover:text-white active:bg-[#C4101F] ${
            isFullscreen
              ? "text-white/80"
              : isGlass
                ? "text-text-primary"
                : isDarkMode
                  ? "text-white/70"
                  : "text-text-primary"
          }`}
          aria-label="Close"
        >
          <LuX size={14} />
        </button>
      </div>
    </div>
  );
}






