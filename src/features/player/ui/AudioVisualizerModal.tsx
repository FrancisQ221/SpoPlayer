import { memo, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloseLine,
  PlayFill,
  PauseLine,
  FullscreenExitLine,
} from "@mingcute/react";
import { SkipNext, SkipPrevious } from "@solar-icons/react";
import { usePlayerState } from "../hooks/usePlayerState";
import { playerEngine } from "../engine/playerEngine";
import { TimelineSlider, formatPlaybackTime } from "./TimelineSlider";
import { CoverImage } from "@/features/covers";
import { extractPaletteFromImage } from "@/features/settings/lib/extractPalette";
import { useLyricsStore } from "@/features/lyrics";

export type VisualizerMode = "spectrum" | "waves" | "orbital" | "starlight";

interface AudioVisualizerModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Web Audio API singleton shared across renders ───────────────────────────
let sharedCtx: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let sharedSource: MediaElementAudioSourceNode | null = null;

function getOrCreateAnalyser(): AnalyserNode | null {
  try {
    const win = typeof window !== "undefined" ? (window as any) : null;
    if (!win) return null;

    const audioEl = (
      win.__spoplayer_audio ||
      document.getElementById("spoplayer-audio")
    ) as HTMLAudioElement | null;
    if (!audioEl) return null;

    const ctx: AudioContext =
      win.__spoplayer_audio_context ||
      sharedCtx ||
      new (window.AudioContext || (window as any).webkitAudioContext)();
    win.__spoplayer_audio_context = ctx;
    sharedCtx = ctx;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    if (!sharedAnalyser || sharedAnalyser.context !== ctx) {
      sharedAnalyser = ctx.createAnalyser();
      sharedAnalyser.fftSize = 256;
      sharedAnalyser.smoothingTimeConstant = 0.78;
    }

    let sourceNode: MediaElementAudioSourceNode | null =
      win.__spoplayer_media_source_node || sharedSource;
    if (!sourceNode) {
      try {
        sourceNode = ctx.createMediaElementSource(audioEl);
        win.__spoplayer_media_source_node = sourceNode;
        sharedSource = sourceNode;
      } catch {
        sourceNode = win.__spoplayer_media_source_node || null;
      }
    }

    if (sourceNode) {
      try {
        sourceNode.connect(sharedAnalyser);
        if (!win.__spoplayer_pitch_graph) {
          sharedAnalyser.connect(ctx.destination);
        }
      } catch {}
    }

    return sharedAnalyser;
  } catch {
    return null;
  }
}

// ─── HSL → CSS helper ────────────────────────────────────────────────────────
function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

// ─── Derive a rich multi-stop color palette from rawRgb ──────────────────────
interface ZenPalette {
  h: number; // hue 0-360
  s: number; // sat 0-100
  l: number; // lightness 0-100
  primary: string;
  glow: string;
  mid: string;
  deep: string;
  bg1: string;
  bg2: string;
}

function buildZenPalette(rawRgb: [number, number, number]): ZenPalette {
  const [r, g, b] = rawRgb;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }
  const hDeg = Math.round(h * 360);
  const sP = Math.round(Math.max(65, s * 100));
  const lP = Math.round(Math.max(50, Math.min(68, l * 100)));

  return {
    h: hDeg,
    s: sP,
    l: lP,
    primary: hsl(hDeg, sP, lP),
    glow: hsl(hDeg, sP, 80, 0.85),
    mid: hsl(hDeg, Math.max(40, sP - 15), lP - 8, 0.75),
    deep: hsl(hDeg, sP, 20, 0.9),
    bg1: hsl(hDeg, 35, 5),
    bg2: hsl((hDeg + 30) % 360, 25, 8),
  };
}

const FALLBACK_PALETTE: ZenPalette = buildZenPalette([0, 245, 155]);

// ─── Zen Mode Live Karaoke Component ─────────────────────────────────────────
interface ZenKaraokeProps {
  trackId?: string;
  positionMs: number;
  palette: ZenPalette;
}

const ZenKaraoke = memo(function ZenKaraoke({
  trackId,
  positionMs,
  palette,
}: ZenKaraokeProps) {
  const storeSyncedLines = useLyricsStore((s) => s.syncedLines);
  const braccatoLyrics = useLyricsStore((s) => s.braccatoLyrics);
  const currentLyricsTrackId = useLyricsStore((s) => s.currentLyricsTrackId);
  const plainLyrics = useLyricsStore((s) => s.plainLyrics);
  const lyricsLoading = useLyricsStore((s) => s.lyricsLoading);

  const isMatching = Boolean(trackId && currentLyricsTrackId === trackId);

  const lines = useMemo(() => {
    if (!isMatching) return [];
    if (storeSyncedLines && storeSyncedLines.length > 0) return storeSyncedLines;
    if (braccatoLyrics && braccatoLyrics.length > 0) {
      return braccatoLyrics.map((b: any) => ({
        timeMs: b.startTimeMs ?? 0,
        text: b.text || "",
        words:
          b.words && b.words.length > 0
            ? b.words.map((w: any) => ({
                text: w.text || w.c || "",
                timeMs: w.startTimeMs ?? w.timeMs ?? 0,
                endMs: w.endTimeMs ?? w.endMs ?? ((w.startTimeMs ?? 0) + 500),
              }))
            : undefined,
      }));
    }
    return [];
  }, [isMatching, storeSyncedLines, braccatoLyrics]);

  // Determine currently active line
  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timeMs <= positionMs) {
      activeIndex = i;
    } else {
      break;
    }
  }

  const activeLine = activeIndex >= 0 ? lines[activeIndex] : null;
  const nextLine = activeIndex + 1 < lines.length ? lines[activeIndex + 1] : null;

  if (lyricsLoading) {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: hsl(palette.h, 40, 70, 0.6) }}>
        <span className="inline-block w-2 h-2 rounded-full animate-ping" style={{ background: palette.primary }} />
        <span>Sincronizando letra...</span>
      </div>
    );
  }

  if (!isMatching || lines.length === 0) {
    if (plainLyrics === "[INSTRUMENTAL]") {
      return (
        <div
          className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2 select-none"
          style={{ color: palette.glow }}
        >
          <span>♪</span>
          <span>Modo Instrumental</span>
          <span>♪</span>
        </div>
      );
    }
    return null;
  }

  if (!activeLine) {
    const firstLine = lines[0];
    return (
      <div className="flex flex-col items-center gap-1 select-none">
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: hsl(palette.h, 30, 60, 0.55) }}>
          Próximamente
        </span>
        <span className="text-base font-medium max-w-lg truncate" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
          {firstLine?.text || "..."}
        </span>
      </div>
    );
  }

  const hasWords = Boolean(activeLine.words && activeLine.words.length > 0);

  // Fallback line progress for line-level synced lyrics
  const lineStart = activeLine.timeMs;
  const activeLineDuration = (activeLine as any).durationMs || 3500;
  const lineEnd = nextLine ? nextLine.timeMs : lineStart + activeLineDuration;
  const lineSpan = Math.max(600, lineEnd - lineStart);
  const lineProgress = Math.min(100, Math.max(0, ((positionMs - lineStart) / lineSpan) * 100));

  return (
    <div className="flex flex-col items-center text-center gap-1.5 max-w-2xl px-4 select-none">
      {/* Current Active Line with Dynamic Color Fill */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`line-${activeIndex}`}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight leading-snug drop-shadow-md"
        >
          {hasWords ? (
            <div className="inline-flex flex-wrap justify-center items-center gap-x-1.5 gap-y-0.5">
              {activeLine.words!.map((w: any, wIdx: number) => {
                const wStart = w.timeMs;
                const wEnd = w.endMs || wStart + 400;
                const wSpan = Math.max(80, wEnd - wStart);
                const wProgress = Math.min(100, Math.max(0, ((positionMs - wStart) / wSpan) * 100));
                const isCurrent = positionMs >= wStart && positionMs < wEnd;
                const isPassed = positionMs >= wEnd;

                return (
                  <span
                    key={wIdx}
                    className="inline-block transition-transform duration-75"
                    style={{
                      transform: isCurrent ? "scale(1.07)" : "scale(1)",
                      backgroundImage: `linear-gradient(to right, ${palette.glow} ${wProgress}%, rgba(255, 255, 255, 0.4) ${wProgress}%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      textShadow:
                        isCurrent || isPassed
                          ? `0 0 16px ${hsl(palette.h, palette.s, palette.l, 0.7)}`
                          : "none",
                    }}
                  >
                    {w.text}
                  </span>
                );
              })}
            </div>
          ) : (
            <span
              className="inline-block transition-all duration-75"
              style={{
                backgroundImage: `linear-gradient(to right, ${palette.glow} ${lineProgress}%, rgba(255, 255, 255, 0.4) ${lineProgress}%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: `0 0 20px ${hsl(palette.h, palette.s, palette.l, Math.min(0.8, lineProgress / 100))}`,
              }}
            >
              {activeLine.text}
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Next Line Subtle Preview */}
      {nextLine && (
        <span
          className="text-xs sm:text-sm font-medium tracking-wide transition-opacity duration-300 max-w-lg truncate"
          style={{ color: "rgba(255, 255, 255, 0.35)" }}
        >
          {nextLine.text}
        </span>
      )}
    </div>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
export const AudioVisualizerModal = memo(function AudioVisualizerModal({
  open,
  onClose,
}: AudioVisualizerModalProps) {
  const player = usePlayerState();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>("spectrum");
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zenPalette, setZenPalette] = useState<ZenPalette>(FALLBACK_PALETTE);
  const zenPaletteRef = useRef<ZenPalette>(FALLBACK_PALETTE);

  const isPlaying = player.status === "playing";
  const track = player.currentTrack;

  // ── Extract palette whenever cover changes ──────────────────────────────────
  useEffect(() => {
    if (!open || !track?.coverUrl) {
      setZenPalette(FALLBACK_PALETTE);
      zenPaletteRef.current = FALLBACK_PALETTE;
      return;
    }
    let cancelled = false;
    extractPaletteFromImage(track.coverUrl).then((p) => {
      if (cancelled || !p) return;
      const palette = buildZenPalette(p.rawRgb);
      setZenPalette(palette);
      zenPaletteRef.current = palette;
    });
    return () => { cancelled = true; };
  }, [open, track?.coverUrl]);

  // ── Auto-hide controls ──────────────────────────────────────────────────────
  const handleMouseMove = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.code === "Space") {
        e.preventDefault();
        playerEngine.togglePlayPause();
      } else if (e.key === "v" || e.key === "V") {
        setMode((prev) => {
          if (prev === "spectrum") return "waves";
          if (prev === "waves") return "orbital";
          if (prev === "orbital") return "starlight";
          return "spectrum";
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ── Main render loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Connect to Web Audio
    const analyser = getOrCreateAnalyser();
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    let animId: number;
    let phase = 0;

    // ─ Particle pool for starlight ─
    interface Particle {
      x: number; y: number;
      radius: number;
      speedX: number; speedY: number;
      alpha: number;
      hueShift: number;
    }
    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 3 + 0.8,
      speedX: (Math.random() - 0.5) * 1.8,
      speedY: (Math.random() - 0.5) * 1.8,
      alpha: Math.random() * 0.8 + 0.2,
      hueShift: Math.random() * 60 - 30,
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ─ Get real frequency data ─
    function getFreqData(): Uint8Array {
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Animated fallback when no analyser
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = isPlaying
            ? Math.abs(Math.sin(phase * 1.5 + i * 0.25) * Math.cos(phase * 0.8 + i * 0.15)) * 200
            : Math.sin(phase + i * 0.2) * 30 + 35;
        }
      }
      return dataArray;
    }

    // ─ Energy helpers ─
    function energy(data: Uint8Array, fromBin: number, toBin: number): number {
      let sum = 0;
      const count = toBin - fromBin;
      if (count <= 0) return 0;
      for (let i = fromBin; i < toBin && i < data.length; i++) sum += data[i];
      return sum / (count * 255);
    }

    const render = () => {
      animId = requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;
      phase += isPlaying ? 0.035 : 0.007;

      const freq = getFreqData();
      const pal = zenPaletteRef.current;

      // Frequency band energies (0-1)
      const bass   = energy(freq, 0,  6);   // sub-bass
      const low    = energy(freq, 6,  18);  // bass
      const mid    = energy(freq, 18, 55);  // mids
      const treble = energy(freq, 55, bufferLength); // highs
      const overall = (bass * 0.4 + low * 0.3 + mid * 0.2 + treble * 0.1);

      // Clear with gradient bg that reacts to bass
      ctx.globalAlpha = 1;
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
      bgGrad.addColorStop(0, hsl(pal.h, 30, 5 + bass * 4));
      bgGrad.addColorStop(0.5, hsl((pal.h + 20) % 360, 20, 3 + bass * 2));
      bgGrad.addColorStop(1, hsl(pal.h, 15, 2));
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // ═══════ MODE: SPECTRUM ═══════════════════════════════════════════════
      if (mode === "spectrum") {
        const numBars = Math.min(bufferLength, 80);
        const totalBarWidth = w * 0.78;
        const gap = 3;
        const barW = (totalBarWidth - gap * (numBars - 1)) / numBars;
        const startX = (w - totalBarWidth) / 2;
        const baseY = h * 0.72;

        for (let i = 0; i < numBars; i++) {
          const norm = i / numBars;
          const binVal = (freq[Math.floor(i * bufferLength / numBars)] ?? 0) / 255;
          // Mirror symmetry: taller in the middle
          const mirror = Math.sin(norm * Math.PI);
          const barH = Math.max(4, binVal * h * 0.55 * mirror + (isPlaying ? 6 : 3));

          const x = startX + i * (barW + gap);
          const y = baseY - barH;

          // Hue shift by position + treble brightness
          const hShift = (pal.h + norm * 40 - 20) % 360;
          const bright = 50 + treble * 25 + binVal * 20;

          const grad = ctx.createLinearGradient(x, baseY, x, y);
          grad.addColorStop(0, hsl(hShift, pal.s, 20, 0.05));
          grad.addColorStop(0.4, hsl(hShift, pal.s, bright - 10, 0.8));
          grad.addColorStop(1, hsl(hShift, Math.min(100, pal.s + 15), bright + 15, 1));

          ctx.fillStyle = grad;
          ctx.beginPath();
          // @ts-ignore – roundRect is standard in modern browsers
          ctx.roundRect(x, y, barW, barH, [Math.min(barW / 2, 4), Math.min(barW / 2, 4), 0, 0]);
          ctx.fill();

          // Glow on tall bars
          if (binVal > 0.55) {
            ctx.shadowColor = hsl(hShift, pal.s, bright + 20);
            ctx.shadowBlur = 10 + binVal * 12;
            ctx.fillStyle = hsl(hShift, 100, 88, binVal * 0.7);
            ctx.beginPath();
            ctx.arc(x + barW / 2, y - 3, Math.min(barW / 2, 3), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Floor glow line
        const lineGrad = ctx.createLinearGradient(startX, 0, startX + totalBarWidth, 0);
        lineGrad.addColorStop(0, hsl(pal.h, pal.s, pal.l, 0));
        lineGrad.addColorStop(0.5, hsl(pal.h, pal.s, pal.l, 0.6 + bass * 0.4));
        lineGrad.addColorStop(1, hsl(pal.h, pal.s, pal.l, 0));
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, baseY);
        ctx.lineTo(startX + totalBarWidth, baseY);
        ctx.stroke();

      // ═══════ MODE: WAVES ══════════════════════════════════════════════════
      } else if (mode === "waves") {
        const waveCount = 5;

        for (let wave = 0; wave < waveCount; wave++) {
          const t = wave / waveCount; // 0..1
          const wavePhase = phase * (1 + wave * 0.3) + wave * 0.7;
          const energyBand = wave < 2 ? bass : wave < 4 ? mid : treble;
          const amp = isPlaying
            ? (60 + energyBand * h * 0.22 + low * 40) * (1 - t * 0.3)
            : 18 * (1 - t * 0.3);
          const yCenter = h * (0.42 + t * 0.18);
          const hShift = (pal.h + wave * 18) % 360;
          const alpha = 0.18 + (1 - t) * 0.55;

          ctx.beginPath();
          for (let x = 0; x <= w; x += 5) {
            const nx = x / w;
            const binIdx = Math.floor(nx * bufferLength);
            const freqBoost = ((freq[binIdx] ?? 0) / 255) * 0.5;
            const angle = nx * Math.PI * 4 + wavePhase;
            const y = yCenter
              + Math.sin(angle) * amp
              + Math.sin(angle * 2.3 + phase * 0.7) * amp * 0.35
              + freqBoost * amp * 0.6;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }

          ctx.strokeStyle = hsl(hShift, pal.s, pal.l, alpha);
          ctx.lineWidth = 2 + (1 - t) * 2.5 + energyBand * 2;
          ctx.shadowColor = hsl(hShift, pal.s, pal.l + 20);
          ctx.shadowBlur = 8 + energyBand * 20;
          ctx.globalAlpha = 1;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;

      // ═══════ MODE: ORBITAL ════════════════════════════════════════════════
      } else if (mode === "orbital") {
        const cx = w / 2;
        const cy = h * 0.44;
        const baseRadius = Math.min(w, h) * 0.14;
        const bassPulse = bass * Math.min(w, h) * 0.1;
        const midPulse  = mid  * Math.min(w, h) * 0.05;

        // Ambient glow orb at center
        const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 1.2);
        centerGlow.addColorStop(0, hsl(pal.h, pal.s, pal.l + 15, 0.25 + bass * 0.4));
        centerGlow.addColorStop(0.6, hsl(pal.h, pal.s, pal.l, 0.08 + bass * 0.12));
        centerGlow.addColorStop(1, hsl(pal.h, pal.s, pal.l, 0));
        ctx.fillStyle = centerGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Orbital rings — each driven by a frequency band
        const rings = [
          { r: baseRadius * 0.8 + bassPulse * 0.6,  energy: bass,   hShift: 0,  lw: 3,   ao: 0.9 },
          { r: baseRadius * 1.3 + bassPulse * 0.4,  energy: low,    hShift: 15, lw: 2,   ao: 0.65 },
          { r: baseRadius * 1.9 + midPulse * 1.2,   energy: mid,    hShift: 30, lw: 1.5, ao: 0.45 },
          { r: baseRadius * 2.6 + midPulse * 0.8,   energy: treble, hShift: 50, lw: 1,   ao: 0.28 },
          { r: baseRadius * 3.5 + overall * 30,     energy: overall,hShift: 70, lw: 0.7, ao: 0.15 },
        ];

        for (const ring of rings) {
          const hh = (pal.h + ring.hShift) % 360;
          const bright = pal.l + ring.energy * 22;

          // Rotating dashes on active rings
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(phase * (ring.hShift % 2 === 0 ? 0.3 : -0.2));
          ctx.setLineDash(isPlaying ? [Math.max(4, ring.r * 0.25), ring.r * 0.15] : []);
          ctx.lineDashOffset = phase * 20;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(6, ring.r), 0, Math.PI * 2);
          ctx.strokeStyle = hsl(hh, pal.s, bright, ring.ao + ring.energy * 0.4);
          ctx.lineWidth = ring.lw + ring.energy * 2.5;
          ctx.shadowColor = hsl(hh, pal.s, bright + 15);
          ctx.shadowBlur = 8 + ring.energy * 25;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Floating energy dots on rings (beat-reactive)
        if (isPlaying) {
          const dotCount = 6;
          for (let d = 0; d < dotCount; d++) {
            const angle = (d / dotCount) * Math.PI * 2 + phase * 0.8;
            const ringR = rings[1].r;
            const dx = cx + Math.cos(angle) * ringR;
            const dy = cy + Math.sin(angle) * ringR;
            const dotSize = 3 + bass * 8;
            const hh = (pal.h + d * 12) % 360;
            ctx.beginPath();
            ctx.arc(dx, dy, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = hsl(hh, 100, 75, 0.85 + bass * 0.15);
            ctx.shadowColor = hsl(hh, 100, 80);
            ctx.shadowBlur = 12 + bass * 18;
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;

      // ═══════ MODE: STARLIGHT ══════════════════════════════════════════════
      } else if (mode === "starlight") {
        // Background nebula
        for (let n = 0; n < 3; n++) {
          const nx = w * (0.25 + n * 0.25) + Math.sin(phase * 0.3 + n) * 60;
          const ny = h * (0.3 + n * 0.2) + Math.cos(phase * 0.25 + n) * 40;
          const nr = (80 + overall * 180 + n * 60);
          const nebula = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
          const hh = (pal.h + n * 35) % 360;
          nebula.addColorStop(0, hsl(hh, pal.s, pal.l, 0.07 + overall * 0.12));
          nebula.addColorStop(1, hsl(hh, pal.s, pal.l, 0));
          ctx.fillStyle = nebula;
          ctx.beginPath();
          ctx.arc(nx, ny, nr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Frequency-driven sparkle bursts
        const burstCount = Math.floor(bufferLength / 12);
        for (let b = 0; b < burstCount; b++) {
          const binVal = (freq[b * 12] ?? 0) / 255;
          if (binVal < 0.35) continue;
          const bx = w * (0.1 + (b / burstCount) * 0.8);
          const by = h * (0.2 + Math.sin(phase + b) * 0.3 + 0.1);
          const br = 1.5 + binVal * 5;
          const hh = (pal.h + b * 10) % 360;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fillStyle = hsl(hh, 100, 80, binVal * 0.9);
          ctx.shadowColor = hsl(hh, 100, 85);
          ctx.shadowBlur = 6 + binVal * 14;
          ctx.fill();
        }

        // Floating particles — speed proportional to overall energy
        const speedMult = isPlaying ? 1 + overall * 4 : 0.4;
        for (const p of particles) {
          p.x += p.speedX * speedMult;
          p.y += p.speedY * speedMult;
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;

          const hh = (pal.h + p.hueShift + phase * 5) % 360;
          const bright = 65 + treble * 25 + bass * 15;
          const size = p.radius * (1 + bass * 1.8 + treble * 0.5);
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.3, size), 0, Math.PI * 2);
          ctx.fillStyle = hsl(hh, pal.s, bright, p.alpha * (isPlaying ? 1 : 0.35));
          ctx.shadowColor = hsl(hh, pal.s, bright + 15);
          ctx.shadowBlur = isPlaying ? 4 + bass * 12 : 0;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, isPlaying]);

  if (!open) return null;

  const durationMs = player.durationMs || 1;
  const pal = zenPalette;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onMouseMove={handleMouseMove}
          className="fixed inset-0 z-[250] overflow-hidden flex flex-col justify-between"
          style={{ background: pal.bg1 }}
        >
          {/* Canvas visualizer */}
          <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

          {/* Soft vignette overlay */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)`,
            }}
          />

          {/* Top Bar */}
          <div
            className={`relative z-20 flex items-center justify-between pl-8 pr-12 pt-6 transition-opacity duration-500 ${
              controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 backdrop-blur-2xl border shadow-2xl"
              style={{ borderColor: hsl(pal.h, pal.s, pal.l, 0.25) }}>
              {(
                [
                  { id: "spectrum",  label: "Espectro" },
                  { id: "waves",     label: "Ondas" },
                  { id: "orbital",   label: "Aura Orbital" },
                  { id: "starlight", label: "Polvo Estelar" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border-0 cursor-pointer"
                  style={
                    mode === m.id
                      ? {
                          background: hsl(pal.h, pal.s, pal.l),
                          color: pal.l > 55 ? "#05120a" : "#fff",
                          boxShadow: `0 0 14px ${hsl(pal.h, pal.s, pal.l, 0.5)}`,
                          fontWeight: 700,
                        }
                      : { color: "rgba(255,255,255,0.6)" }
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              title="Salir del modo Zen (Esc)"
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-white/10 backdrop-blur-xl border text-white/80 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-lg"
              style={{ borderColor: hsl(pal.h, pal.s, pal.l, 0.3) }}
            >
              <FullscreenExitLine size={20} />
            </button>
          </div>

          {/* Album Art — glowing with cover color */}
          <div className="relative z-10 flex flex-col items-center justify-center -mt-6 pointer-events-none">
            <div
              className="relative rounded-3xl overflow-hidden border-2 transition-all duration-700"
              style={{
                width: 220,
                height: 220,
                borderColor: hsl(pal.h, pal.s, pal.l, 0.5),
                boxShadow: `0 0 60px ${hsl(pal.h, pal.s, pal.l, 0.35)}, 0 0 120px ${hsl(pal.h, pal.s, pal.l, 0.18)}`,
              }}
            >
              <CoverImage
                src={track?.coverUrl || ""}
                alt={track?.title || "Artwork"}
                className="w-full h-full object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(to top, ${hsl(pal.h, pal.s, 10, 0.45)}, transparent)` }} />
              )}
            </div>

            {/* Pulsing ring under album art */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 280,
                height: 280,
                border: `1px solid ${hsl(pal.h, pal.s, pal.l, 0.25)}`,
                boxShadow: `0 0 30px ${hsl(pal.h, pal.s, pal.l, 0.15)}`,
                animation: isPlaying ? "zen-pulse 2.2s ease-in-out infinite" : "none",
              }}
            />

            {/* Live Zen Karaoke Under Artwork */}
            <div className="mt-8 z-10 min-h-[64px] flex items-center justify-center">
              <ZenKaraoke
                trackId={track?.id}
                positionMs={player.positionMs}
                palette={pal}
              />
            </div>
          </div>

          {/* Floating Bottom Dock */}
          <div
            className={`relative z-20 flex justify-center pb-8 px-4 transition-opacity duration-500 ${
              controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div
              className="max-w-2xl w-full flex flex-col gap-3 p-4 rounded-3xl backdrop-blur-2xl border shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
              style={{
                background: "rgba(0,0,0,0.72)",
                borderColor: hsl(pal.h, pal.s, pal.l, 0.22),
              }}
            >
              {/* Track Info & Controls */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="text-[16px] font-bold text-white truncate">
                    {track?.title || "Sin reproducción"}
                  </span>
                  <span className="text-[13px] truncate mt-0.5" style={{ color: hsl(pal.h, 60, 70, 0.8) }}>
                    {track?.artists || "SpoPlayer"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => playerEngine.skipPrevious()}
                    className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white/90 hover:text-white transition-all flex items-center justify-center border-0 cursor-pointer"
                  >
                    <SkipPrevious size={20} weight="Bold" />
                  </button>

                  <button
                    type="button"
                    onClick={() => playerEngine.togglePlayPause()}
                    className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-0 cursor-pointer font-bold"
                    style={{
                      background: hsl(pal.h, pal.s, pal.l),
                      color: pal.l > 55 ? "#05120a" : "#fff",
                      boxShadow: `0 0 22px ${hsl(pal.h, pal.s, pal.l, 0.55)}`,
                    }}
                  >
                    {isPlaying ? <PauseLine size={24} /> : <PlayFill size={24} className="ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => playerEngine.skipNext()}
                    className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white/90 hover:text-white transition-all flex items-center justify-center border-0 cursor-pointer"
                  >
                    <SkipNext size={20} weight="Bold" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3 w-full">
                <span className="text-[11px] font-medium tabular-nums" style={{ color: hsl(pal.h, 40, 60, 0.6) }}>
                  {formatPlaybackTime(player.positionMs)}
                </span>
                <div className="flex-1">
                  <TimelineSlider
                    positionMs={player.positionMs}
                    durationMs={durationMs}
                    onSeek={(pos) => playerEngine.seek(pos)}
                    size="sm"
                    fillColor={hsl(pal.h, pal.s, pal.l)}
                    showThumb
                  />
                </div>
                <span className="text-[11px] font-medium tabular-nums" style={{ color: hsl(pal.h, 40, 60, 0.6) }}>
                  {formatPlaybackTime(durationMs)}
                </span>
              </div>
            </div>
          </div>

          {/* CSS keyframe for album art pulse */}
          <style>{`
            @keyframes zen-pulse {
              0%, 100% { transform: scale(1);   opacity: 0.6; }
              50%       { transform: scale(1.06); opacity: 0.25; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
