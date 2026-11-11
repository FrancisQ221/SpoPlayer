import { useState, useEffect } from "react";
import { useTranslation } from "@/languages";
import { usePlayerStore } from "@/features/player";
import { ToggleSwitch, TextInput } from "@/shared/ui";
import Button from "@/shared/ui/Button";
import { SettingRow, SettingSection, SegmentedControl } from "../controls";
import { useLastFmStore } from "@/features/scrobbler/store/lastFmStore";

export function PlaybackTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const autoplaySimilar = usePlayerStore((state) => state.autoplaySimilar);
  const setAutoplaySimilar = usePlayerStore(
    (state) => state.setAutoplaySimilar,
  );
  const trackDoubleClickBehavior = usePlayerStore(
    (state) => state.trackDoubleClickBehavior,
  );
  const setTrackDoubleClickBehavior = usePlayerStore(
    (state) => state.setTrackDoubleClickBehavior,
  );
  const defaultPlaybackContext = usePlayerStore(
    (state) => state.defaultPlaybackContext,
  );
  const setDefaultPlaybackContext = usePlayerStore(
    (state) => state.setDefaultPlaybackContext,
  );
  const pauseOnDeviceChange = usePlayerStore(
    (state) => state.pauseOnDeviceChange,
  );
  const setPauseOnDeviceChange = usePlayerStore(
    (state) => state.setPauseOnDeviceChange,
  );
  const crossfadeSeconds = usePlayerStore((state) => state.crossfadeSeconds ?? 0);
  const setCrossfadeSeconds = usePlayerStore((state) => state.setCrossfadeSeconds);
  const dynamicLevelingEnabled = usePlayerStore((state) => state.dynamicLevelingEnabled ?? true);
  const setDynamicLevelingEnabled = usePlayerStore((state) => state.setDynamicLevelingEnabled);
  const bassSwapEnabled = usePlayerStore((state) => state.bassSwapEnabled ?? true);
  const setBassSwapEnabled = usePlayerStore((state) => state.setBassSwapEnabled);
  const gaplessEnabled = usePlayerStore((state) => state.gaplessEnabled ?? true);
  const setGaplessEnabled = usePlayerStore((state) => state.setGaplessEnabled);
  const spatialAudioEnabled = usePlayerStore((state) => state.spatialAudioEnabled ?? false);
  const setSpatialAudioEnabled = usePlayerStore((state) => state.setSpatialAudioEnabled);
  const spatialAudioSpeed = usePlayerStore((state) => state.spatialAudioSpeed ?? "normal");
  const setSpatialAudioSpeed = usePlayerStore((state) => state.setSpatialAudioSpeed);

  // Last.fm Scrobbler store
  const lastFmEnabled = useLastFmStore((s) => s.enabled);
  const setLastFmEnabled = useLastFmStore((s) => s.setEnabled);
  const lastFmUsername = useLastFmStore((s) => s.username);
  const setLastFmUsername = useLastFmStore((s) => s.setUsername);
  const lastFmSessionKey = useLastFmStore((s) => s.sessionKey);
  const setLastFmSessionKey = useLastFmStore((s) => s.setSessionKey);
  const lastFmThreshold = useLastFmStore((s) => s.scrobbleThresholdPercent);
  const setLastFmThreshold = useLastFmStore((s) => s.setThreshold);
  const lastFmStatus = useLastFmStore((s) => s.lastScrobbleStatus);
  const lastFmMessage = useLastFmStore((s) => s.lastScrobbleMessage);
  const disconnectLastFm = useLastFmStore((s) => s.disconnect);

  const [inputSk, setInputSk] = useState("");
  const [inputUser, setInputUser] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col gap-[16px]">
      <SettingSection>

      <SettingRow
        title={t("settings.autoplay_similar.title")}
        description={t("settings.autoplay_similar.description")}
        titleKey="settings.autoplay_similar.title"
        descKey="settings.autoplay_similar.description"
        searchQuery={searchQuery}
        control={
          <ToggleSwitch
            checked={autoplaySimilar}
            onChange={setAutoplaySimilar}
          />
        }
      />

      <SettingRow
        title={t("settings.track_double_click.title")}
        description={t("settings.track_double_click.description")}
        titleKey="settings.track_double_click.title"
        descKey="settings.track_double_click.description"
        searchQuery={searchQuery}
        control={
          mounted ? (
            <SegmentedControl
              ariaLabel={t("settings.track_double_click.title")}
              value={trackDoubleClickBehavior}
              onChange={setTrackDoubleClickBehavior}
              options={[
                {
                  value: "play",
                  label: t("settings.track_double_click.play"),
                },
                {
                  value: "queue",
                  label: t("settings.track_double_click.queue"),
                },
              ]}
            />
          ) : (
            <span />
          )
        }
      />

      <SettingRow
        title={t("settings.default_playback_context.title")}
        description={t("settings.default_playback_context.description")}
        titleKey="settings.default_playback_context.title"
        descKey="settings.default_playback_context.description"
        searchQuery={searchQuery}
        control={
          mounted ? (
            <SegmentedControl
              ariaLabel={t("settings.default_playback_context.title")}
              value={defaultPlaybackContext}
              onChange={setDefaultPlaybackContext}
              options={[
                {
                  value: "resume",
                  label: t("settings.default_playback_context.resume"),
                },
                {
                  value: "empty",
                  label: t("settings.default_playback_context.empty"),
                },
              ]}
            />
          ) : (
            <span />
          )
        }
      />

      <SettingRow
        title={t("settings.audio.pause_on_device_change.title")}
        description={t("settings.audio.pause_on_device_change.description")}
        titleKey="settings.audio.pause_on_device_change.title"
        descKey="settings.audio.pause_on_device_change.description"
        searchQuery={searchQuery}
        control={
          <ToggleSwitch
            checked={pauseOnDeviceChange}
            onChange={setPauseOnDeviceChange}
          />
        }
      />

      <SettingRow
        title={t("settings.playback.crossfade") || "Fundido de canciones (Crossfade)"}
        description={
          t("settings.playback.crossfade_desc") ||
          "Mezcla suavemente el final de una pista con el inicio de la siguiente sin silencios."
        }
        searchQuery={searchQuery}
        control={
          mounted ? (
            <SegmentedControl
              ariaLabel="Crossfade"
              value={String(crossfadeSeconds)}
              onChange={(val) => setCrossfadeSeconds(Number(val))}
              options={[
                { value: "0", label: "Off" },
                { value: "3", label: "3s" },
                { value: "5", label: "5s" },
                { value: "8", label: "8s" },
                { value: "12", label: "12s" },
              ]}
            />
          ) : (
            <span />
          )
        }
      />

      <SettingRow
        title={t("settings.playback.dynamic_leveling") || "Nivelación dinámica de volumen"}
        description={
          t("settings.playback.dynamic_leveling_desc") ||
          "Ajusta automáticamente el volumen entre canciones para que suenen al mismo nivel percibido."
        }
        titleKey="settings.playback.dynamic_leveling"
        descKey="settings.playback.dynamic_leveling_desc"
        searchQuery={searchQuery}
        control={
          <ToggleSwitch
            checked={dynamicLevelingEnabled}
            onChange={setDynamicLevelingEnabled}
          />
        }
      />

      <SettingRow
        title={t("settings.playback.bass_swap") || "Bass-Swap en Crossfade"}
        description={
          t("settings.playback.bass_swap_desc") ||
          "Corta las frecuencias graves de la pista que termina durante el fundido para evitar solapamiento de bajos."
        }
        titleKey="settings.playback.bass_swap"
        descKey="settings.playback.bass_swap_desc"
        searchQuery={searchQuery}
        control={
          <ToggleSwitch
            checked={bassSwapEnabled}
            onChange={setBassSwapEnabled}
          />
        }
      />

      <SettingRow
        title={t("settings.playback.gapless") || "Reproducción Gapless Estricta"}
        description={
          t("settings.playback.gapless_desc") ||
          "Elimina el silencio entre canciones para una transición continua sin pausas (0ms)."
        }
        titleKey="settings.playback.gapless"
        descKey="settings.playback.gapless_desc"
        searchQuery={searchQuery}
        control={
          <ToggleSwitch
            checked={gaplessEnabled}
            onChange={setGaplessEnabled}
          />
        }
      />

      <SettingRow
        title={t("settings.playback.spatial_audio") || "Audio Espacial 8D"}
        description={
          t("settings.playback.spatial_audio_desc") ||
          "Simula un sonido envolvente en 360° con sombra acústica de cabeza. Recomendado con auriculares."
        }
        titleKey="settings.playback.spatial_audio"
        descKey="settings.playback.spatial_audio_desc"
        searchQuery={searchQuery}
        control={
          <ToggleSwitch
            checked={spatialAudioEnabled}
            onChange={setSpatialAudioEnabled}
          />
        }
      />

      {spatialAudioEnabled && (
        <SettingRow
          title={t("settings.playback.spatial_speed") || "Velocidad de rotación 8D"}
          description={
            t("settings.playback.spatial_speed_desc") ||
            "Velocidad a la que la música gira en 360° alrededor de tu cabeza."
          }
          titleKey="settings.playback.spatial_speed"
          descKey="settings.playback.spatial_speed_desc"
          searchQuery={searchQuery}
          control={
            mounted ? (
              <SegmentedControl
                ariaLabel="Spatial Audio Speed"
                value={spatialAudioSpeed}
                onChange={(val) => setSpatialAudioSpeed(val as "slow" | "normal" | "fast")}
                options={[
                  { value: "slow", label: t("settings.playback.spatial_speed_slow") || "Lenta (16s)" },
                  { value: "normal", label: t("settings.playback.spatial_speed_normal") || "Normal (10s)" },
                  { value: "fast", label: t("settings.playback.spatial_speed_fast") || "Rápida (5.5s)" },
                ]}
              />
            ) : (
              <span />
            )
          }
        />
      )}
    </SettingSection>

    <SettingSection label="Last.fm & Scrobbling">
      <SettingRow
        title="Scrobble automático en Last.fm"
        description="Registra tus reproducciones y comparte lo que estás escuchando en tu perfil de Last.fm en tiempo real."
        searchQuery={searchQuery}
        control={
          <ToggleSwitch
            checked={lastFmEnabled && Boolean(lastFmSessionKey)}
            onChange={(checked) => {
              if (checked && !lastFmSessionKey) {
                // Focus/prompt key
                return;
              }
              setLastFmEnabled(checked);
            }}
          />
        }
      />

      {lastFmSessionKey ? (
        <SettingRow
          title={`Conectado como: ${lastFmUsername || "Usuario Last.fm"}`}
          description={
            lastFmMessage
              ? `Estado: ${lastFmMessage}`
              : "Sesión activa y lista para hacer scrobble al 50% de cada canción."
          }
          control={
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={disconnectLastFm}
            >
              Desconectar
            </Button>
          }
        />
      ) : (
        <SettingRow
          title="Clave de sesión de Last.fm (Session Key)"
          description="Introduce tu Session Key de Last.fm para vincular tu cuenta y habilitar el scrobbling."
          control={
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Session Key..."
                value={inputSk}
                onChange={(e) => setInputSk(e.target.value)}
                className="w-48 h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--accent-primary,#00f59b)]/50"
              />
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={!inputSk.trim()}
                onClick={() => {
                  if (inputSk.trim()) {
                    setLastFmSessionKey(inputSk.trim());
                    if (inputUser.trim()) setLastFmUsername(inputUser.trim());
                    setInputSk("");
                  }
                }}
              >
                Vincular
              </Button>
            </div>
          }
        />
      )}

      <SettingRow
        title="Porcentaje mínimo para Scrobble"
        description="Punto de la canción en el que se envía el registro a Last.fm."
        control={
          mounted ? (
            <SegmentedControl
              ariaLabel="Scrobble threshold"
              value={String(lastFmThreshold)}
              onChange={(val) => setLastFmThreshold(Number(val))}
              options={[
                { value: "50", label: "50%" },
                { value: "75", label: "75%" },
                { value: "90", label: "90%" },
              ]}
            />
          ) : (
            <span />
          )
        }
      />
    </SettingSection>
  </div>
  );
}
