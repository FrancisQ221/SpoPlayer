import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ToastProvider, AppleEmojiProvider, RootErrorBoundary, GlobalTooltip, WindowAnimationContainer } from "@/shared/ui";
import { useWindowDrag } from "@/shared/hooks";
import { useAppIconSync } from "@/features/player";
import { I18nProvider } from "@/languages";
import { AuthLock } from "@/features/auth";
import { CoverSwRegistrar } from "@/features/covers";
import { usePresenceSync } from "@/shared/presence";
import { useThemeCustomizationSync } from "@/features/settings";
import { useTouchBarSync } from "@/features/touchbar";
import { useOverlaySync } from "@/features/overlay";
import { useTraySync } from "@/features/tray";
import { useLocalFileDrop } from "@/features/library/hooks/useLocalFileDrop";
import { AppRoutes } from "./routes";
import DeeplinkHandler from "./DeeplinkHandler";
import EnvironmentWarning from "./EnvironmentWarning";
import { ConnectivityWall } from "@/features/connectivity";
import "./globals.css";

function AppIconSync() {
  useAppIconSync();
  return null;
}

function PresenceSync() {
  usePresenceSync();
  return null;
}

function ThemeSync() {
  useThemeCustomizationSync();
  return null;
}

function TouchBarSync() {
  useTouchBarSync();
  return null;
}

function OverlaySync() {
  useOverlaySync();
  return null;
}

function TraySync() {
  useTraySync();
  return null;
}

function LocalFileDropSync() {
  const { isDraggingOver } = useLocalFileDrop();
  if (!isDraggingOver) return null;
  return (
    <div className="fixed inset-0 z-[999999] pointer-events-none bg-black/75 backdrop-blur-md flex flex-col items-center justify-center border-4 border-dashed border-[var(--accent-primary,#00f59b)] text-white select-none">
      <div className="p-8 rounded-3xl bg-bg-elevated/95 border border-border-primary/40 flex flex-col items-center gap-3 shadow-2xl">
        <div className="h-16 w-16 rounded-full bg-[var(--accent-primary,#00f59b)]/20 text-[var(--accent-primary,#00f59b)] flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-text-primary">Suelta para reproducir archivo local</h3>
        <p className="text-sm text-text-secondary">Compatible con MP3, FLAC, WAV, M4A, OGG</p>
      </div>
    </div>
  );
}

export default function App() {
  useWindowDrag();

  return (
    <HashRouter>
      <CoverSwRegistrar />
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="system"
        enableSystem={true}
        disableTransitionOnChange
      >
        <GlobalTooltip />
        <ThemeSync />
        <AppIconSync />
        <PresenceSync />
        <TouchBarSync />
        <OverlaySync />
        <TraySync />
        <LocalFileDropSync />
        <AppleEmojiProvider>
          <I18nProvider>
            <ToastProvider>
              <RootErrorBoundary>
                <WindowAnimationContainer>
                  <DeeplinkHandler />
                  <EnvironmentWarning />
                  <ConnectivityWall />
                  <AuthLock>
                    <AppRoutes />
                  </AuthLock>
                </WindowAnimationContainer>
              </RootErrorBoundary>
            </ToastProvider>
          </I18nProvider>
        </AppleEmojiProvider>
      </ThemeProvider>
    </HashRouter>
  );
}
