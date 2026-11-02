import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloseLine,
  FireFill,
  HeadphoneLine,
  Music2Line,
  PlayFill,
  SunLine,
  MoonLine,
  SunriseLine,
  SunsetLine,
} from "@mingcute/react";
import Dialog from "@/shared/ui/Dialog";
import { useStatsStore, getStatsSummary } from "../store/statsStore";
import { CoverImage } from "@/features/covers";
import { playerEngine } from "@/features/player";

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
}

export const StatsModal = memo(function StatsModal({
  open,
  onClose,
}: StatsModalProps) {
  const records = useStatsStore((s) => s.records);
  const summary = getStatsSummary(records);

  const timeOfDayIcons = [
    { label: "Madrugada (0-6h)", count: summary.timeOfDay[0], Icon: MoonLine },
    { label: "Mañana (6-12h)", count: summary.timeOfDay[1], Icon: SunriseLine },
    { label: "Tarde (12-18h)", count: summary.timeOfDay[2], Icon: SunLine },
    { label: "Noche (18-24h)", count: summary.timeOfDay[3], Icon: SunsetLine },
  ];

  const maxTimeOfDay = Math.max(1, ...summary.timeOfDay);
  const maxArtistPlays = summary.topArtists[0]?.count || 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (!next ? onClose() : undefined)}
      maxWidth={720}
      className="p-0 max-h-[85vh] !bg-[#090e0b] !border !border-[var(--accent-primary,#00f59b)]/25 !rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(0,245,155,0.08)] overflow-hidden"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] flex items-center justify-center border border-[var(--accent-primary,#00f59b)]/30 shadow-[0_0_15px_rgba(0,245,155,0.15)]">
              <FireFill size={22} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[18px] font-bold text-white tracking-tight m-0">
                Tu Cápsula Musical
              </h2>
              <span className="text-[12px] text-text-tertiary">
                Estadísticas en vivo de tus hábitos de escucha
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-text-tertiary hover:text-white border border-transparent transition-all flex items-center justify-center cursor-pointer"
          >
            <CloseLine size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 no-scrollbar">
          {summary.totalPlays === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center select-none">
              <HeadphoneLine size={48} className="text-text-tertiary mb-3 opacity-40" />
              <h3 className="text-lg font-semibold text-white mb-1">
                Aún no hay estadísticas registradas
              </h3>
              <p className="text-sm text-text-tertiary max-w-sm leading-relaxed">
                Empieza a reproducir tus canciones favoritas. En cuanto escuches música por más de 15 segundos, tu cápsula personal comenzará a llenarse.
              </p>
            </div>
          ) : (
            <>
              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-1">
                  <span className="text-[11.5px] uppercase font-bold tracking-wider text-text-tertiary">
                    Tiempo de Escucha
                  </span>
                  <span className="text-2xl font-black text-[var(--accent-primary,#00f59b)] drop-shadow-[0_0_12px_rgba(0,245,155,0.25)]">
                    {summary.totalHours} <span className="text-sm font-semibold text-white/70">horas</span>
                  </span>
                  <span className="text-[11px] text-text-tertiary">
                    {summary.totalMinutes} minutos totales
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-1">
                  <span className="text-[11.5px] uppercase font-bold tracking-wider text-text-tertiary">
                    Canciones Reproducidas
                  </span>
                  <span className="text-2xl font-black text-white">
                    {summary.totalPlays}
                  </span>
                  <span className="text-[11px] text-text-tertiary">
                    Reproducciones acumuladas
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-1">
                  <span className="text-[11.5px] uppercase font-bold tracking-wider text-text-tertiary">
                    Artistas Descubiertos
                  </span>
                  <span className="text-2xl font-black text-white">
                    {summary.uniqueArtists}
                  </span>
                  <span className="text-[11px] text-text-tertiary">
                    Diversidad musical
                  </span>
                </div>
              </div>

              {/* Tu Obsesión Actual */}
              {summary.topTrack && (
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-text-tertiary px-1">
                    Tu Obsesión Actual
                  </span>
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[var(--accent-primary,#00f59b)]/12 via-white/[0.03] to-transparent border border-[var(--accent-primary,#00f59b)]/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg">
                        <CoverImage
                          src={summary.topTrack.coverUrl || ""}
                          alt={summary.topTrack.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-base font-bold text-white truncate">
                          {summary.topTrack.title}
                        </span>
                        <span className="text-xs text-text-secondary truncate mt-0.5">
                          {summary.topTrack.artist}
                        </span>
                        <span className="text-[11px] text-[var(--accent-primary,#00f59b)] font-semibold mt-1">
                          🔥 {summary.topTrack.count} {summary.topTrack.count === 1 ? "reproducción" : "reproducciones"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top 5 Artistas */}
              {summary.topArtists.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-text-tertiary px-1">
                    Top 5 Artistas Más Escuchados
                  </span>
                  <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    {summary.topArtists.map((artist, i) => {
                      const pct = Math.round((artist.count / maxArtistPlays) * 100);
                      return (
                        <div key={artist.name} className="flex flex-col gap-1 py-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-white truncate flex items-center gap-2">
                              <span className="text-text-tertiary font-mono w-4">#{i + 1}</span>
                              {artist.name}
                            </span>
                            <span className="text-text-tertiary font-mono shrink-0 ml-2">
                              {artist.count} {artist.count === 1 ? "canción" : "canciones"}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--accent-primary,#00f59b)] transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Momentos del Día */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[12px] font-bold uppercase tracking-wider text-text-tertiary px-1">
                  Tu Ritmo del Día (Horas Más Activas)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {timeOfDayIcons.map(({ label, count, Icon }) => {
                    const pct = Math.round((count / maxTimeOfDay) * 100);
                    return (
                      <div
                        key={label}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <Icon size={16} className="text-[var(--accent-primary,#00f59b)]" />
                          <span className="text-xs font-bold text-white">{count}</span>
                        </div>
                        <span className="text-[11px] text-text-tertiary truncate">
                          {label}
                        </span>
                        <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--accent-primary,#00f59b)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
});
