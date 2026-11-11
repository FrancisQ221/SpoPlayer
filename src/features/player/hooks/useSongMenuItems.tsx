import { useCallback } from "react";
import {
  LuRadio,
  LuStepForward,
  LuListPlus,
  LuHeart,
  LuPlus,
  LuTrash2,
  LuFolderPlus,
  LuDownload,
  LuMusic,
} from "react-icons/lu";
import { CheckCircleFill } from "@mingcute/react";
import { useOfflineStore, offlineManager } from "@/features/offline";
import { spoplayerDb } from "@/shared/storage";
import { resolvePlaybackStream } from "../engine/streamResolver";
import { downloadAudioBytes } from "@/shared/media/innertube";
import type { DropdownMenuItem } from "@/shared/ui/DropdownMenu";
import { playerEngine } from "../engine/playerEngine";
import {
  usePlaylistsList,
  useLikeTrack,
  useUnlikeTrack,
  useIsTrackLiked,
  useModalStore,
} from "@/features/library";
import { useTranslation } from "@/languages";
import { showToast } from "@/shared/ui";

export interface SongMenuContext {
  id?: string;
  title: string;
  artists: string;
  coverUrl: string;
  duration?: string;
  durationMs?: number;
  searchType?: "track" | "album" | "artist" | "playlist";
  totalTracks?: number;
  playlistId?: string;
  playlistItemId?: string;
  playlistTitle?: string;
}

export function useSongMenuItems(ctx: SongMenuContext): DropdownMenuItem[] {
  const { t } = useTranslation();
  const {
    id,
    title,
    artists,
    coverUrl,
    duration,
    durationMs,
    searchType,
    totalTracks,
    playlistId,
    playlistItemId,
    playlistTitle,
  } = ctx;

  const { data: playlistsData } = usePlaylistsList();

  const likeMutation = useLikeTrack();
  const unlikeMutation = useUnlikeTrack();

  const liked = useIsTrackLiked(id);

  const isDownloaded = useOfflineStore((s) => (id ? s.downloadedTrackIds.includes(id) : false));
  const isDownloading = useOfflineStore((s) => (id ? s.isDownloading(id) : false));

  const handleDownload = useCallback(async () => {
    if (!id) return;
    if (isDownloaded) {
      await offlineManager.removeDownload(id);
    } else {
      await offlineManager.downloadTrack({
        id,
        title,
        artists,
        coverUrl,
        durationMs: durationMs ?? 0,
        playCount: 0,
      });
    }
  }, [id, isDownloaded, title, artists, coverUrl, durationMs]);

  const handleLike = useCallback(async () => {
    if (!id) return;
    if (liked) {
      unlikeMutation.mutate(id);
    } else {
      likeMutation.mutate(id);
    }
  }, [id, liked, likeMutation, unlikeMutation]);

  const handleExportMp3 = useCallback(async () => {
    if (!id) return;
    const electron = (window as any).spoplayer;
    if (!electron?.exportTrackMp3) {
      showToast("Exportación disponible solo en la app de escritorio", "error");
      return;
    }

    showToast("Preparando exportación MP3...", "info", {
      description: `${title} — ${artists}`,
    });

    try {
      let audioBlob: Blob | null = null;
      const cached = await spoplayerDb.getAudio(id);
      if (cached?.blob) {
        audioBlob = cached.blob;
      } else {
        const stream = await resolvePlaybackStream({
          id,
          title,
          artists,
          durationMs: durationMs ?? 0,
        });
        if (stream.blob) {
          audioBlob = stream.blob;
        } else {
          const bytes = await downloadAudioBytes(stream.url, {
            contentLength: stream.contentLength,
          });
          if (bytes) {
            audioBlob = new Blob([bytes], { type: stream.mimeType || "audio/webm" });
          }
        }
      }

      if (!audioBlob) {
        throw new Error("No se pudo obtener el audio para exportar");
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      const res = await electron.exportTrackMp3({
        title,
        artist: artists,
        coverUrl,
        audioBytes: uint8,
      });

      if (res?.success) {
        showToast("MP3 exportado con éxito", "checkmark", {
          description: "Guardado en Música/SpoPlayer con etiquetas ID3 y carátula HD",
        });
      } else {
        throw new Error(res?.error || "Error al exportar");
      }
    } catch (err: any) {
      showToast("Error al exportar MP3", "error", {
        description: err?.message || String(err),
      });
    }
  }, [id, title, artists, coverUrl, durationMs]);

  const buildMenu = useCallback((): DropdownMenuItem[] => {
    const isTrack = searchType === "track" || !searchType;

    if (isTrack) {
      if (playlistId) {
        return [
          {
            id: "start-radio",
            label: t("common.start_radio"),
            icon: <LuRadio size={15} />,
            onClick: () => {
              if (!id) return;
              void playerEngine.startRadioStation({
                id,
                title,
                artists,
                coverUrl,
                durationMs: durationMs ?? 0,
                playCount: 0,
              });
            },
          },
          {
            id: "play-next",
            label: t("common.play_next"),
            icon: <LuStepForward size={15} />,
            onClick: () => {
              if (!id) return;
              playerEngine.playNext({
                id,
                title,
                artists,
                coverUrl,
                durationMs: durationMs ?? 0,
                playCount: 0,
              });
            },
          },
          {
            id: "add-to-queue",
            label: t("common.add_to_queue"),
            icon: <LuListPlus size={15} />,
            onClick: () => {
              if (!id) return;
              playerEngine.addToQueue({
                id,
                title,
                artists,
                coverUrl,
                durationMs: durationMs ?? 0,
                playCount: 0,
              });
              showToast(t("common.added_to_queue"), "checkmark", {
                description: artists ? `${title} — ${artists}` : title,
              });
            },
          },
          {
            id: liked ? "unlike-track" : "like-track",
            label: liked ? t("common.unlike") : t("common.like"),
            icon: (
              <LuHeart
                size={15}
                className={liked ? "fill-red-500 text-red-500" : "text-text-secondary"}
              />
            ),
            onClick: handleLike,
          },
          {
            id: isDownloaded ? "remove-download" : "download-track",
            label: isDownloading
              ? (t("offline.downloading") || "Descargando...")
              : isDownloaded
                ? (t("offline.remove_download") || "Eliminar descarga")
                : (t("offline.download_track") || "Descargar canción"),
            icon: isDownloading ? (
              <div className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            ) : isDownloaded ? (
              <CheckCircleFill size={15} className="text-emerald-400" />
            ) : (
              <LuDownload size={15} />
            ),
            onClick: handleDownload,
          },
          {
            id: "export-mp3",
            label: "Exportar MP3 (con ID3 y Carátula)",
            icon: <LuMusic size={15} />,
            onClick: handleExportMp3,
          },
          {
            id: "remove-from-playlist",
            label: t("common.remove_from_playlist"),
            icon: <LuTrash2 size={15} />,
            danger: true,
            onClick: () => {
              if (!id) return;
              useModalStore.getState().openRemoveFromPlaylist({
                trackId: id,
                playlistItemId,
                trackTitle: title,
                trackArtists: artists,
                trackCoverUrl: coverUrl,
                playlistId,
                playlistTitle,
              });
            },
          },
        ];
      }

      return [
        {
          id: "start-radio",
          label: t("common.start_radio"),
          icon: <LuRadio size={15} />,
          onClick: () => {
            if (!id) return;
            void playerEngine.startRadioStation({
              id,
              title,
              artists,
              coverUrl,
              durationMs: durationMs ?? 0,
              playCount: 0,
            });
          },
        },
        {
          id: "play-next",
          label: t("common.play_next"),
          icon: <LuStepForward size={15} />,
          onClick: () => {
            if (!id) return;
            playerEngine.playNext({
              id,
              title,
              artists,
              coverUrl,
              durationMs: durationMs ?? 0,
              playCount: 0,
            });
          },
        },
        {
          id: "add-to-queue",
          label: t("common.add_to_queue"),
          icon: <LuListPlus size={15} />,
          onClick: () => {
            if (!id) return;
            playerEngine.addToQueue({
              id,
              title,
              artists,
              coverUrl,
              durationMs: durationMs ?? 0,
              playCount: 0,
            });
            showToast(t("common.added_to_queue"), "checkmark", {
              description: artists ? `${title} — ${artists}` : title,
            });
          },
        },
        {
          id: liked ? "unlike-track" : "like-track",
          label: liked ? t("common.unlike") : t("common.like"),
          icon: (
            <LuHeart
              size={15}
              className={liked ? "fill-red-500 text-red-500" : "text-text-secondary"}
            />
          ),
          onClick: handleLike,
        },
        {
          id: isDownloaded ? "remove-download" : "download-track",
          label: isDownloading
            ? (t("offline.downloading") || "Descargando...")
            : isDownloaded
              ? (t("offline.remove_download") || "Eliminar descarga")
              : (t("offline.download_track") || "Descargar canción"),
          icon: isDownloading ? (
            <div className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          ) : isDownloaded ? (
            <CheckCircleFill size={15} className="text-emerald-400" />
          ) : (
            <LuDownload size={15} />
          ),
          onClick: handleDownload,
        },
        {
          id: "export-mp3",
          label: "Exportar MP3 (con ID3 y Carátula)",
          icon: <LuMusic size={15} />,
          onClick: handleExportMp3,
        },
        {
          id: "add-to-playlist",
          label: t("common.add_to_playlist"),
          icon: <LuPlus size={15} />,
          onClick: () => {
            if (!id) return;
            useModalStore.getState().openAddToPlaylist({
              id,
              title,
              artists,
              coverUrl,
              duration,
              playlists: playlistsData?.playlists ?? [],
            });
          },
        },
      ];
    }

    return [
      {
        id: "add-to-library",
        label: t("common.add_to_library"),
        icon: <LuFolderPlus size={15} />,
        onClick: () => {
          if (!id) return;
          useModalStore.getState().openAddToLibrary({
            id,
            title,
            coverUrl,
            type: (searchType as "album" | "artist" | "playlist") || "album",
            subtitle: artists,
            totalTracks,
          });
        },
      },
    ];
  }, [
    id,
    title,
    artists,
    coverUrl,
    duration,
    durationMs,
    searchType,
    totalTracks,
    playlistId,
    playlistItemId,
    playlistTitle,
    liked,
    handleLike,
    isDownloaded,
    isDownloading,
    handleDownload,
    playlistsData,
    t,
  ]);

  return buildMenu();
}
