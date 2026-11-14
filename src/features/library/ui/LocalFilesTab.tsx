import { useState, useMemo, useCallback, useEffect } from "react";
import {
  PlayFill,
  Search2Line,
  FolderLine,
  AddLine,
  Refresh1Line,
  CloseLine,
  MusicLine,
} from "@mingcute/react";
import { LuShuffle, LuFolderOpen } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/shared/ui/Button";
import SongCardWithMenu from "@/features/player/ui/SongCardWithMenu";
import { useLocalMediaStore } from "../store/localMediaStore";
import { playerEngine } from "@/features/player";
import { useTranslation } from "@/languages";
import { useIsContentTransparent } from "@/features/settings/store/customizationStore";

export function LocalFilesTab() {
  const { t } = useTranslation();
  const {
    folders,
    tracks,
    isScanning,
    init,
    scan,
    addFolder,
    removeFolder,
    openFileInFolder,
  } = useLocalMediaStore();
  const [searchQuery, setSearchQuery] = useState("");
  const hasCustomBg = useIsContentTransparent();

  useEffect(() => {
    void init();
  }, [init]);

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase().trim();
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        track.artists.toLowerCase().includes(q) ||
        track.album?.title.toLowerCase().includes(q),
    );
  }, [tracks, searchQuery]);

  const handlePlayAll = useCallback(
    (shuffle: boolean = false) => {
      if (filteredTracks.length === 0) return;
      const list = shuffle
        ? [...filteredTracks].sort(() => Math.random() - 0.5)
        : filteredTracks;
      playerEngine.playTrack(list[0], list, "Archivos locales");
    },
    [filteredTracks],
  );

  return (
    <div className="flex flex-col gap-[20px] pb-[40px]">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-[12px] pt-[8px]">
        {/* Play & Shuffle buttons */}
        <div className="flex items-center gap-[8px] flex-wrap">
          <button
            type="button"
            disabled={filteredTracks.length === 0}
            onClick={() => handlePlayAll(false)}
            className="flex items-center gap-[6px] h-[36px] px-[18px] rounded-lg bg-[var(--accent-primary,#00f59b)] text-[var(--btn-primary-text,#05120a)] font-semibold text-[13px] hover:bg-[var(--accent-secondary,#39ffb4)] hover:shadow-[0_0_15px_var(--border-white-alpha-33)] active:scale-[0.96] transition-all disabled:opacity-50 disabled:pointer-events-none border-0 cursor-pointer select-none"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            <PlayFill size={16} />
            <span>{t("common.play") || "Reproducir todo"}</span>
          </button>

          <button
            type="button"
            disabled={filteredTracks.length === 0}
            onClick={() => handlePlayAll(true)}
            title="Reproducción aleatoria"
            className="flex items-center justify-center h-[36px] w-[36px] rounded-lg bg-bg-elevated border border-border-primary hover:border-text-primary/30 text-text-primary hover:text-[var(--accent-primary,#00f59b)] active:scale-[0.96] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <LuShuffle size={16} />
          </button>

          <button
            type="button"
            onClick={() => addFolder()}
            title="Agregar carpeta local a la biblioteca"
            className="flex items-center gap-[6px] h-[36px] px-[12px] rounded-lg bg-bg-elevated border border-border-primary hover:border-[var(--accent-primary,#00f59b)]/50 text-text-primary hover:text-[var(--accent-primary,#00f59b)] text-[13px] font-medium active:scale-[0.96] transition-all cursor-pointer select-none"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            <AddLine size={16} />
            <span>Añadir carpeta</span>
          </button>

          <button
            type="button"
            disabled={isScanning}
            onClick={() => scan()}
            title="Escanear carpetas en busca de nuevas canciones"
            className="flex items-center gap-[6px] h-[36px] px-[12px] rounded-lg bg-bg-elevated border border-border-primary hover:border-text-primary/30 text-text-secondary hover:text-text-primary text-[13px] active:scale-[0.96] transition-all cursor-pointer select-none"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            <Refresh1Line
              size={15}
              className={isScanning ? "animate-spin text-[var(--accent-primary,#00f59b)]" : ""}
            />
            <span>{isScanning ? "Escaneando..." : "Escanear"}</span>
          </button>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-[8px] text-[13px] text-text-secondary">
          <span className="px-[10px] py-[4px] rounded-md bg-bg-elevated border border-border-subtle font-medium">
            {tracks.length} {tracks.length === 1 ? "canción" : "canciones"}
          </span>
        </div>
      </div>

      {/* Configured Folders Pills */}
      {folders.length > 0 && (
        <div className="flex flex-wrap items-center gap-[8px] text-[12px]">
          <span className="text-text-tertiary flex items-center gap-[4px]">
            <FolderLine size={14} />
            <span>Carpetas activas:</span>
          </span>
          {folders.map((folder) => (
            <div
              key={folder}
              className="flex items-center gap-[6px] pl-[10px] pr-[6px] py-[3px] rounded-md bg-bg-elevated/80 border border-border-subtle text-text-secondary text-[12px] group"
            >
              <span className="truncate max-w-[260px]" title={folder}>
                {folder}
              </span>
              <button
                type="button"
                onClick={() => removeFolder(folder)}
                title="Quitar carpeta de la biblioteca"
                className="text-text-tertiary hover:text-red-400 p-[2px] rounded border-0 bg-transparent cursor-pointer transition-colors"
              >
                <CloseLine size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input Bar */}
      {tracks.length > 0 && (
        <div className="relative w-full max-w-[360px]">
          <Search2Line
            size={16}
            className="absolute left-[12px] top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por canción, artista o álbum local..."
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
      )}

      {/* Main Content Area */}
      {isScanning && tracks.length === 0 ? (
        <div className="flex flex-col gap-[12px] py-[24px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[56px] w-full animate-pulse rounded-lg bg-bg-elevated/40"
            />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-[64px] px-[24px] text-center select-none">
          <div
            className={`h-[72px] w-[72px] rounded-2xl flex items-center justify-center mb-[18px] ${
              hasCustomBg ? "apple-glass-static" : "bg-bg-elevated text-text-tertiary"
            }`}
          >
            <MusicLine size={36} className="text-text-secondary" />
          </div>
          <h2
            className="text-[20px] font-semibold text-text-primary mb-[8px]"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            No se encontraron archivos de música local
          </h2>
          <p
            className="text-[14px] text-text-secondary max-w-[440px] mb-[24px] leading-relaxed"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Agrega la carpeta donde guardas tus canciones (MP3, FLAC, WAV, M4A) o arrastra archivos directamente a la aplicación para escucharlos aquí.
          </p>
          <div className="flex items-center gap-[10px]">
            <Button
              variant="primary"
              onClick={() => addFolder()}
              className="!h-[38px] px-[18px]"
            >
              <AddLine size={16} />
              <span>Añadir carpeta de música</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => scan()}
              className="!h-[38px] px-[16px]"
            >
              <Refresh1Line size={16} />
              <span>Escanear Música de Windows</span>
            </Button>
          </div>
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="py-[48px] text-center text-text-secondary text-[14px]">
          No se encontraron canciones que coincidan con &quot;{searchQuery}&quot;
        </div>
      ) : (
        <div className="flex flex-col gap-[2px]">
          {filteredTracks.map((track) => (
            <SongCardWithMenu
              key={track.id}
              id={track.id}
              title={track.title}
              artists={track.artists}
              coverUrl={track.coverUrl}
              playlistTitle="Archivos locales"
              onPlay={() => {
                playerEngine.playTrack(track, filteredTracks, "Archivos locales");
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
      )}
    </div>
  );
}
