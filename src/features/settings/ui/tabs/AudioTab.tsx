import { useState, useEffect } from "react";
import { FolderOpenLine } from "@mingcute/react";
import { useToast, ToggleSwitch, Select } from "@/shared/ui";
import Button from "@/shared/ui/Button";
import { useTranslation } from "@/languages";
import { usePlayerStore, type AudioQuality } from "@/features/player";
import { useConnectivityStore } from "@/features/connectivity";
import { SettingRow, SettingSection } from "../controls";
import { useModalStore } from "@/features/library";
import { useEqualizerStore, EQUALIZER_PRESETS } from "@/features/player/store/equalizerStore";

interface DeviceOption {
  value: string;
  label: string;
}

export function AudioTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const [dumpExported, setDumpExported] = useState(false);

  const audioQuality = usePlayerStore((state) => state.audioQuality);
  const setAudioQuality = usePlayerStore((state) => state.setAudioQuality);
  const audioOutputDeviceId = usePlayerStore((state) => state.audioOutputDeviceId ?? "default");
  const setAudioOutputDeviceId = usePlayerStore((state) => state.setAudioOutputDeviceId);
  const monoAudioEnabled = usePlayerStore((state) => state.monoAudioEnabled ?? false);
  const setMonoAudioEnabled = usePlayerStore((state) => state.setMonoAudioEnabled);

  const [outputDevices, setOutputDevices] = useState<DeviceOption[]>([
    { value: "default", label: "Dispositivo predeterminado del sistema" },
  ]);

  const connRunning = useConnectivityStore((s) => s.running);
  const connChecks = useConnectivityStore((s) => s.checks);
  const connLastRunAt = useConnectivityStore((s) => s.lastRunAt);
  const runAndSaveDump = useConnectivityStore((s) => s.runAndSaveDump);
  const openEqualizer = useModalStore((s) => s.openEqualizer);
  const eqEnabled = useEqualizerStore((s) => s.enabled);
  const eqPreset = useEqualizerStore((s) => s.preset);
  const eqPresetLabel = EQUALIZER_PRESETS[eqPreset]?.label || "Personalizado";

  useEffect(() => {
    setMounted(true);

    const refreshDevices = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs: DeviceOption[] = devices
          .filter((d) => d.kind === "audiooutput")
          .map((d, i) => ({
            value: d.deviceId || (i === 0 ? "default" : `device-${i}`),
            label: d.label || (d.deviceId === "default" || i === 0 ? "Dispositivo predeterminado del sistema" : `Salida de audio ${i + 1}`),
          }));

        if (outputs.length > 0) {
          const hasDefault = outputs.some((d) => d.value === "default");
          if (!hasDefault) {
            outputs.unshift({ value: "default", label: "Dispositivo predeterminado del sistema" });
          }
          setOutputDevices(outputs);
        }
      } catch (e) {
        console.warn("[AudioTab] Failed to enumerate audio devices:", e);
      }
    };

    void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
    };
  }, []);

  // lossless is listed as unavailable, so the picker only offers live tiers
  const quality: Exclude<AudioQuality, "lossless"> =
    audioQuality === "lossless" ? "high" : audioQuality;

  const deviceOptions = [...outputDevices];
  if (!deviceOptions.some((d) => d.value === audioOutputDeviceId)) {
    deviceOptions.unshift({
      value: audioOutputDeviceId,
      label: audioOutputDeviceId === "default" ? "Dispositivo predeterminado del sistema" : "Dispositivo guardado",
    });
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <SettingSection label="Dispositivo y Calidad">
        <SettingRow
          title="Dispositivo de salida de audio"
          description="Selecciona por qué altavoces, auriculares o interfaz de sonido se reproducirá la música."
          searchQuery={searchQuery}
          control={
            mounted ? (
              <Select
                aria-label="Dispositivo de salida de audio"
                className="w-[240px]"
                value={audioOutputDeviceId}
                onChange={setAudioOutputDeviceId}
                options={deviceOptions}
              />
            ) : (
              <span />
            )
          }
        />

        <SettingRow
          title={t("settings.audio.title")}
          description={t("settings.audio.description")}
          titleKey="settings.audio.title"
          descKey="settings.audio.description"
          searchQuery={searchQuery}
          control={
            mounted ? (
              <Select
                aria-label={t("settings.audio.title")}
                className="w-[240px]"
                value={quality}
                onChange={setAudioQuality}
                options={[
                  { value: "low", label: t("settings.audio.low") },
                  { value: "standard", label: t("settings.audio.standard") },
                  { value: "high", label: t("settings.audio.high") },
                ]}
              />
            ) : (
              <span />
            )
          }
        />

        <SettingRow
          title="Audio mono"
          description="Combina los canales estéreo izquierdo y derecho para que ambos auriculares emitan el mismo sonido completo. Ideal si escuchas música con un solo auricular."
          searchQuery={searchQuery}
          control={
            <ToggleSwitch
              checked={monoAudioEnabled}
              onChange={setMonoAudioEnabled}
            />
          }
        />
      </SettingSection>

      <SettingSection label="Ecualizador">
        <SettingRow
          title="Ecualizador de audio (5 bandas)"
          description={
            eqEnabled
              ? `Activo — Preajuste actual: ${eqPresetLabel}`
              : "Desactivado. Haz clic para abrir el ecualizador y moldear las frecuencias de audio a tu gusto."
          }
          control={
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={openEqualizer}
              className="flex items-center gap-1.5"
            >
              <span>Abrir ecualizador</span>
            </Button>
          }
        />
      </SettingSection>

      <SettingSection label={t("settings.connection.title")}>
        <SettingRow
          title={t("settings.connection.checks_title")}
          titleKey="settings.connection.checks_title"
          searchQuery={searchQuery}
          description={
            connChecks.length > 0 && connLastRunAt
              ? t("settings.connection.last_run", {
                  ok: connChecks.filter((c) => c.status === "ok").length,
                  total: connChecks.length,
                  time: new Date(connLastRunAt).toLocaleTimeString(),
                })
              : t("settings.connection.never_run")
          }
          control={
            <div className="flex items-center gap-[8px]">
              {dumpExported && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    const targetPath = useConnectivityStore.getState().lastSavedDumpPath || undefined;
                    if (window.spoplayerElectron?.openExportFolder) {
                      await window.spoplayerElectron.openExportFolder(targetPath);
                    } else if (window.spoplayerElectron?.openDownloads) {
                      await window.spoplayerElectron.openDownloads(targetPath);
                    } else {
                      toast(t("settings.connection.open_folder"), "info");
                    }
                  }}
                  title={t("settings.connection.open_folder")}
                  aria-label={t("settings.connection.open_folder")}
                  className="!h-[34px] !w-[34px] !px-0"
                >
                  <FolderOpenLine size={18} />
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={connRunning}
                onClick={async () => {
                  const res = await runAndSaveDump();
                  if (res.success) {
                    setDumpExported(true);
                    toast(t("settings.connection.saved"), "success");
                  } else if (!res.canceled) {
                    toast(t("settings.connection.failed"), "error");
                  }
                }}
              >
                {connRunning
                  ? t("settings.connection.checking")
                  : t("settings.connection.button")}
              </Button>
            </div>
          }
        />
      </SettingSection>
    </div>
  );
}
