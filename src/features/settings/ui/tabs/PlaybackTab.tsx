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
