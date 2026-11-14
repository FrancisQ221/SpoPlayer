import { useEffect, useState } from "react";
import { playerEngine } from "@/features/player";
import { showToast } from "@/shared/ui";
import type { Track } from "@/shared/types";

const AUDIO_EXTS = [".mp3", ".flac", ".wav", ".m4a", ".ogg", ".aac", ".opus", ".wma"];

export function useLocalFileDrop() {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types?.includes("Files")) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set false if leaving the window
      if (!e.relatedTarget || e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDraggingOver(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const electron = (window as any).spoplayer;
      if (!electron?.parseLocalAudioFile) return;

      const audioFiles: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = (file as any).path || "";
        const lower = filePath.toLowerCase();
        if (AUDIO_EXTS.some((ext) => lower.endsWith(ext))) {
          audioFiles.push(filePath);
        }
      }

      if (audioFiles.length === 0) return;

      try {
        const tracks: Track[] = [];
        for (const f of audioFiles) {
          const raw = await electron.parseLocalAudioFile(f);
          if (raw) {
            tracks.push({
              id: raw.id,
              title: raw.title || "Pista local",
              artists: raw.artists || "Artista local",
              coverUrl: raw.coverUrl || "",
              durationMs: raw.durationMs || 180000,
              playCount: 0,
              releaseDate: raw.year,
              album: {
                id: `local-album:${encodeURIComponent(raw.album || "local")}`,
                title: raw.album || "Álbum local",
              },
            });
          }
        }

        if (tracks.length > 0) {
          playerEngine.playTrack(tracks[0], tracks, "Archivo local");
          showToast(
            tracks.length === 1
              ? "Reproduciendo archivo local"
              : `Reproduciendo ${tracks.length} archivos locales`,
            "checkmark",
            {
              description: `${tracks[0].title} — ${tracks[0].artists}`,
            },
          );
        }
      } catch (err: any) {
        showToast("Error al abrir archivo de audio", "error", {
          description: err?.message,
        });
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  return { isDraggingOver };
}
