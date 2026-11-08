import { useMemo } from "react";
import { useTranslation } from "@/languages";
import { useOverlaySettingsStore } from "@/features/overlay";
import { ToggleSwitch } from "@/shared/ui";
import { SettingRow, SettingSection, SegmentedControl } from "../controls";
import { useTraySettingsStore } from "@/features/tray";

const POSITION_CONFIG = [
  { value: "top-left" as const, key: "settings.overlay.position.top_left", fallback: "Top Left" },
  { value: "top-center" as const, key: "settings.overlay.position.top_center", fallback: "Top Middle" },
  { value: "top-right" as const, key: "settings.overlay.position.top_right", fallback: "Top Right" },
] as const;

export function OverlayTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();

  const enabled = useOverlaySettingsStore((s) => s.enabled);
  const setEnabled = useOverlaySettingsStore((s) => s.setEnabled);

  const position = useOverlaySettingsStore((s) => s.position);
  const setPosition = useOverlaySettingsStore((s) => s.setPosition);

  const positionOptions = useMemo(
    () =>
      POSITION_CONFIG.map((opt) => ({
        value: opt.value,
        label: t(opt.key) || opt.fallback,
      })),
    [t],
  );

  const autoShowOnMinimize = useOverlaySettingsStore((s) => s.autoShowOnMinimize);
  const setAutoShowOnMinimize = useOverlaySettingsStore((s) => s.setAutoShowOnMinimize);

  const alwaysOnTop = useOverlaySettingsStore((s) => s.alwaysOnTop);
  const setAlwaysOnTop = useOverlaySettingsStore((s) => s.setAlwaysOnTop);

  const minimizeToTray = useTraySettingsStore((s) => s.minimizeToTray);
  const setMinimizeToTray = useTraySettingsStore((s) => s.setMinimizeToTray);
  const notifyOnTrackChange = useTraySettingsStore((s) => s.notifyOnTrackChange);
  const setNotifyOnTrackChange = useTraySettingsStore((s) => s.setNotifyOnTrackChange);

  return (
    <div className="flex flex-col gap-[16px]">
      <SettingSection>
        <SettingRow
          title={t("settings.overlay.enabled.title") || "Activar superposición"}
          description={
            t("settings.overlay.enabled.description") ||
            "Muestra un reproductor flotante en miniatura sobre otras ventanas."
          }
          titleKey="settings.overlay.enabled.title"
          descKey="settings.overlay.enabled.description"
          searchQuery={searchQuery}
          control={
            <ToggleSwitch
              checked={enabled}
              onChange={setEnabled}
            />
          }
        />
      </SettingSection>

      <SettingSection>
        <div className="flex flex-col gap-4">
          <SettingRow
            title={t("settings.overlay.position.title") || "Position"}
            description={
              t("settings.overlay.position.description") ||
              "Choose where the overlay appears on your screen."
            }
            titleKey="settings.overlay.position.title"
            descKey="settings.overlay.position.description"
            searchQuery={searchQuery}
            control={
              <SegmentedControl
                options={positionOptions}
                value={position}
                onChange={setPosition}
                disabled={!enabled}
                ariaLabel="Overlay Position"
              />
            }
          />

          <SettingRow
            title={
              t("settings.overlay.auto_show_on_minimize.title") ||
              "Auto-show on minimize"
            }
            description={
              t("settings.overlay.auto_show_on_minimize.description") ||
              "Automatically show the overlay when SpoPlayer is minimized."
            }
            titleKey="settings.overlay.auto_show_on_minimize.title"
            descKey="settings.overlay.auto_show_on_minimize.description"
            searchQuery={searchQuery}
            control={
              <ToggleSwitch
                checked={autoShowOnMinimize}
                onChange={setAutoShowOnMinimize}
                disabled={!enabled}
              />
            }
          />

          <SettingRow
            title={t("settings.overlay.always_on_top.title") || "Always on top"}
            description={
              t("settings.overlay.always_on_top.description") ||
              "Keep the overlay floating above other windows."
            }
            titleKey="settings.overlay.always_on_top.title"
            descKey="settings.overlay.always_on_top.description"
            searchQuery={searchQuery}
            control={
              <ToggleSwitch
                checked={alwaysOnTop}
                onChange={setAlwaysOnTop}
                disabled={!enabled}
              />
            }
          />
        </div>
      </SettingSection>

      <SettingSection label="Bandeja del sistema">
        <div className="flex flex-col gap-4">
          <SettingRow
            title="Minimizar a la bandeja al minimizar (-)"
            description="Al minimizar la ventana, ocultarla de la barra de tareas y dejarla disponible únicamente en la bandeja del sistema."
            titleKey="Minimizar a la bandeja al minimizar"
            descKey="ocultarla de la barra de tareas y dejarla en la bandeja"
            searchQuery={searchQuery}
            control={
              <ToggleSwitch
                checked={minimizeToTray}
                onChange={setMinimizeToTray}
              />
            }
          />

          <SettingRow
            title="Notificaciones de canción"
            description="Mostrar una notificación nativa del sistema cuando comience una nueva canción mientras SpoPlayer esté en segundo plano."
            titleKey="Notificaciones de canción"
            descKey="notificación nativa del sistema cuando comience una canción"
            searchQuery={searchQuery}
            control={
              <ToggleSwitch
                checked={notifyOnTrackChange}
                onChange={setNotifyOnTrackChange}
              />
            }
          />
        </div>
      </SettingSection>
    </div>
  );
}

export default OverlayTab;
