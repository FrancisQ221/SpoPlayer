import { useState, useMemo, useCallback } from "react";
import {
  DownloadLine,
  PlayFill,
  DeleteLine,
  Search2Line,
  MusicLine,
  CloseLine,
} from "@mingcute/react";
import { LuShuffle } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/shared/ui/Button";
import SongCardWithMenu from "@/features/player/ui/SongCardWithMenu";
import { useOfflineTracks } from "../hooks/useOfflineTracks";
import { offlineManager } from "../services/offlineManager";
import { playerEngine } from "@/features/player";
import { useTranslation } from "@/languages";
import { useIsContentTransparent } from "@/features/settings/store/customizationStore";
import type { Track } from "@/shared/types";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function DownloadsTab() {
  const { t } = useTranslation();
  const { tracks, totalBytes, isLoading, refresh } = useOfflineTracks();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const hasCustomBg = useIsContentTransparent();

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase().trim();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artists.toLowerCase().includes(q) ||
        t.album?.title.toLowerCase().includes(q),
    );
  }, [tracks, searchQuery]);

  const handlePlayAll = useCallback(
    (shuffle: boolean = false) => {
      if (filteredTracks.length === 0) return;
      const list = shuffle
        ? [...filteredTracks].sort(() => Math.random() - 0.5)
        : filteredTracks;
      playerEngine.playTrack(list[0], list, "Descargas");
    },
    [filteredTracks],
  );

  const handleClearAll = useCallback(async () => {
    await offlineManager.clearAllDownloads();
    setConfirmClearOpen(false);
    void refresh();
  }, [refresh]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-[12px] py-[24px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[56px] w-full animate-pulse rounded-lg bg-bg-elevated/40"
          />
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-[64px] px-[24px] text-center select-none">
        <div
          className={`h-[72px] w-[72px] rounded-2xl flex items-center justify-center mb-[18px] ${
            hasCustomBg ? "apple-glass-static" : "bg-bg-elevated text-text-tertiary"
          }`}
        >
          <DownloadLine size={36} className="text-text-secondary" />
        </div>
        <h2
          className="text-[20px] font-semibold text-text-primary mb-[8px]"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          {t("offline.empty_title") || "No tienes música descargada"}
        </h2>
        <p
          className="text-[14px] text-text-secondary max-w-[420px] mb-[24px] leading-relaxed"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          {t("offline.empty_desc") ||
            "Descarga canciones o listas de reproducción para escucharlas en cualquier lugar sin conexión WiFi o datos móviles."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[20px] pb-[40px]">
      {/* Header Banner */}
      <div
        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[16px] p-[20px] rounded-2xl ${
          hasCustomBg ? "apple-glass-card" : "bg-bg-panel border border-border-subtle"
        }`}
      >
        <div className="flex items-center gap-[16px]">
          <div className="h-[52px] w-[52px] rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-500 shrink-0">
            <DownloadLine size={28} />
          </div>
          <div>
            <h1
              className="text-[20px] font-bold text-text-primary m-0"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {t("offline.title") || "Música descargada"}
            </h1>
            <p className="text-[13px] text-text-secondary m-0 mt-[2px]">
              {tracks.length}{" "}
              {tracks.length === 1
                ? t("common.song") || "canción"
                : t("common.songs") || "canciones"}{" "}
              • {formatBytes(totalBytes)} •{" "}
              <span className="text-emerald-500 font-medium">{t("offline.badge_offline") || "Disponible sin conexión"}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-[8px] w-full sm:w-auto flex-wrap">
          <Button
            variant="primary"
            onClick={() => handlePlayAll(false)}
            className="flex items-center gap-[6px] text-[13px] h-[36px] px-[16px]"
          >
            <PlayFill size={16} />
            <span>{t("offline.play_all") || "Reproducir"}</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => handlePlayAll(true)}
            className="flex items-center gap-[6px] text-[13px] h-[36px] px-[14px]"
            title={t("offline.shuffle") || "Aleatorio"}
          >
            <LuShuffle size={15} />
            <span className="hidden sm:inline">{t("offline.shuffle") || "Aleatorio"}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => setConfirmClearOpen(true)}
            className="flex items-center justify-center text-text-tertiary hover:text-red-400 h-[36px] w-[36px] p-0"
            title={t("offline.clear_all") || "Borrar todas las descargas"}
          >
            <DeleteLine size={18} />
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmClearOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-[16px]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="flex flex-col gap-[16px] max-w-[400px] w-full rounded-2xl bg-bg-panel border border-border-subtle p-[24px]"
            >
              <h3 className="text-[17px] font-semibold text-text-primary m-0">
                {t("offline.clear_all") || "Borrar todas las descargas"}
              </h3>
              <p className="text-[13px] text-text-secondary m-0 leading-relaxed">
                {t("offline.clear_all_confirm_desc") ||
                  t("offline.clear_all_confirm") ||
                  "¿Estás seguro de que deseas eliminar toda la música descargada? Ya no podrás reproducirla sin conexión a internet."}
              </p>
              <div className="flex justify-end gap-[8px] mt-[8px]">
                <Button variant="ghost" onClick={() => setConfirmClearOpen(false)}>
                  {t("common.cancel") || "Cancelar"}
                </Button>
                <Button
                  variant="secondary"
                  className="!text-red-400 hover:!bg-red-500/10 border-red-500/30"
                  onClick={handleClearAll}
                >
                  {t("common.delete") || "Eliminar"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search Filter Bar */}
      <div className="relative w-full max-w-[360px]">
        <Search2Line
          size={16}
          className="absolute left-[12px] top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("offline.search_placeholder") || "Buscar música descargada..."}
          className="w-full h-[36px] pl-[34px] pr-[32px] rounded-lg bg-bg-elevated/60 border border-border-subtle text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary/30 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-[8px] top-1/2 -translate-y-1/2 p-[4px] text-text-tertiary hover:text-text-primary border-0 bg-transparent cursor-pointer"
          >
            <CloseLine size={14} />
          </button>
        )}
      </div>

      {/* Tracks List */}
      <div className="flex flex-col gap-[2px]">
        {filteredTracks.map((track) => (
          <SongCardWithMenu
            key={track.id}
            id={track.id}
            title={track.title}
            artists={track.artists}
            artistId={track.artistId}
            coverUrl={track.coverUrl}
            playlistTitle="Descargas"
            onPlay={() => {
              playerEngine.playTrack(track, filteredTracks, "Descargas");
            }}
            duration={
              track.durationMs
                ? `${Math.floor(track.durationMs / 60000)}:${String(
                    Math.floor((track.durationMs % 60000) / 1000),
                  ).padStart(2, "0")}`
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
