import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { CloseLine, Search2Line, CloseCircleFill, ExitLine, KeyboardLine } from "@mingcute/react";
import {
  Play,
  Palette,
  Gallery,
  HeadphonesRound,
  Database,
  Widget5,
} from "@solar-icons/react";
import Dialog from "@/shared/ui/Dialog";
import { UserAvatar } from "@/shared/ui";
import { useTranslation, getTranslationsForAllLocales } from "@/languages";
import { useModalStore } from "@/features/library";
import { useAuthStore } from "@/features/auth";
import {
  PlaybackTab,
  ShortcutsTab,
  AppearanceTab,
  CustomizationTab,
  AudioTab,
  StorageTab,
  OverlayTab,
} from "./tabs";

type TabId = "Playback" | "Shortcuts" | "Overlay" | "Appearance" | "Customization" | "Audio" | "Storage";

const TAB_ICONS: Record<TabId, React.ComponentType<any>> = {
  Playback: Play,
  Shortcuts: KeyboardLine,
  Overlay: Widget5,
  Appearance: Palette,
  Customization: Gallery,
  Audio: HeadphonesRound,
  Storage: Database,
};

const TAB_GROUPS: { labelKey: "preferences" | "application"; ids: TabId[] }[] = [
  { labelKey: "preferences", ids: ["Playback", "Shortcuts", "Overlay", "Audio", "Appearance", "Customization"] },
  { labelKey: "application", ids: ["Storage"] },
];


const SETTING_ITEMS: { tabId: TabId; titleKey: string; descKey?: string }[] = [
  // Playback
  { tabId: "Playback", titleKey: "settings.autoplay_similar.title", descKey: "settings.autoplay_similar.description" },
  { tabId: "Playback", titleKey: "settings.track_double_click.title", descKey: "settings.track_double_click.description" },
  { tabId: "Playback", titleKey: "settings.default_playback_context.title", descKey: "settings.default_playback_context.description" },
  { tabId: "Playback", titleKey: "settings.audio.pause_on_device_change.title", descKey: "settings.audio.pause_on_device_change.description" },
  { tabId: "Playback", titleKey: "settings.playback.crossfade", descKey: "settings.playback.crossfade_desc" },

  // Shortcuts
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.main_app_section", descKey: "settings.shortcuts.main_app_desc" },
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.miniplayer_section", descKey: "settings.shortcuts.miniplayer_desc" },
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.play_pause", descKey: "settings.shortcuts.play_pause_desc" },
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.next_track", descKey: "settings.shortcuts.next_track_desc" },
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.prev_track", descKey: "settings.shortcuts.prev_track_desc" },
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.like_track", descKey: "settings.shortcuts.like_track_desc" },
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.toggle_zen_mode", descKey: "settings.shortcuts.toggle_zen_mode_desc" },
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.toggle_stats", descKey: "settings.shortcuts.toggle_stats_desc" },
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.toggle_sleep_timer", descKey: "settings.shortcuts.toggle_sleep_timer_desc" },
  { tabId: "Shortcuts", titleKey: "settings.shortcuts.toggle_lyrics_mode", descKey: "settings.shortcuts.toggle_lyrics_mode_desc" },

  // Overlay & Tray
  { tabId: "Overlay", titleKey: "settings.overlay.enabled.title", descKey: "settings.overlay.enabled.description" },
  { tabId: "Overlay", titleKey: "settings.overlay.position.title", descKey: "settings.overlay.position.description" },
  { tabId: "Overlay", titleKey: "settings.overlay.auto_show_on_minimize.title", descKey: "settings.overlay.auto_show_on_minimize.description" },
  { tabId: "Overlay", titleKey: "settings.overlay.always_on_top.title", descKey: "settings.overlay.always_on_top.description" },
  { tabId: "Overlay", titleKey: "Minimizar a la bandeja al minimizar", descKey: "ocultarla de la barra de tareas y dejarla en la bandeja" },
  { tabId: "Overlay", titleKey: "Notificaciones de canción", descKey: "notificación nativa del sistema cuando comience una canción" },


  // Appearance
  { tabId: "Appearance", titleKey: "settings.language.label", descKey: "settings.language.description" },
  { tabId: "Appearance", titleKey: "settings.theme.title", descKey: "settings.theme.description" },

  // Customization
  { tabId: "Customization", titleKey: "settings.customization.wallpaper_title", descKey: "settings.customization.wallpaper_description" },
  { tabId: "Customization", titleKey: "settings.customization.blocks_title", descKey: "settings.customization.blocks_description" },
  { tabId: "Customization", titleKey: "settings.customization.reset_all", descKey: "settings.customization.reset_all_desc" },

  // Audio
  { tabId: "Audio", titleKey: "settings.audio.title", descKey: "settings.audio.description" },
  { tabId: "Audio", titleKey: "settings.connection.checks_title" },

  // Storage
  { tabId: "Storage", titleKey: "settings.storage.title", descKey: "settings.storage.description" },
  { tabId: "Storage", titleKey: "settings.storage.usage_title" },
  { tabId: "Storage", titleKey: "settings.storage.open_folder", descKey: "settings.storage.open_folder_description" },

];

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;

export default function SettingsModal() {
  const { t } = useTranslation();
  const open = useModalStore((state) => state.settingsOpen);
  const close = useModalStore((state) => state.closeSettings);

  const [activeTab, setActiveTab] = useState<TabId>("Playback");
  const [searchQuery, setSearchQuery] = useState("");

  const handleClose = () => {
    setSearchQuery("");
    close();
  };

  const tabLabels: Record<TabId, string> = {
    Playback: t("settings.tabs.playback"),
    Shortcuts: t("settings.tabs.shortcuts") || "Shortcuts",
    Overlay: t("settings.tabs.overlay") || "Overlay",
    Appearance: t("settings.tabs.appearance"),
    Customization: t("settings.tabs.customization") || "Customization",
    Audio: t("settings.tabs.audio"),
    Storage: t("settings.tabs.storage"),
  };

  const tabDescriptions: Record<TabId, string> = {
    Playback: t("settings.playback.description"),
    Shortcuts: t("settings.shortcuts.description") || "System-wide and player keyboard shortcuts.",
    Overlay: t("settings.overlay.description") || "Desktop overlay behavior, position and lyrics display.",
    Appearance: t("settings.theme.description"),
    Customization: t("settings.customization.description") || "Window background wallpaper, transparency and block blur effects.",
    Audio: t("settings.audio.description"),
    Storage: t("settings.storage.description"),
  };

  const matchingTabIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    const set = new Set<TabId>();

    const TAB_LABEL_KEYS: Record<TabId, string> = {
      Playback: "settings.tabs.playback",
      Shortcuts: "settings.tabs.shortcuts",
      Overlay: "settings.tabs.overlay",
      Appearance: "settings.theme.title",
      Customization: "settings.tabs.customization",
      Audio: "settings.tabs.audio",
      Storage: "settings.tabs.storage",
    };

    const TAB_DESC_KEYS: Record<TabId, string> = {
      Playback: "settings.playback.description",
      Shortcuts: "settings.shortcuts.description",
      Overlay: "settings.overlay.description",
      Appearance: "settings.theme.description",
      Customization: "settings.customization.description",
      Audio: "settings.audio.description",
      Storage: "settings.storage.description",
    };


    (Object.keys(TAB_LABEL_KEYS) as TabId[]).forEach((tabId) => {
      const texts = [
        ...getTranslationsForAllLocales(TAB_LABEL_KEYS[tabId]),
        ...getTranslationsForAllLocales(TAB_DESC_KEYS[tabId]),
      ];
      if (texts.some((txt) => txt.toLowerCase().includes(query))) {
        set.add(tabId);
      }
    });

    SETTING_ITEMS.forEach((item) => {
      const texts = [
        ...getTranslationsForAllLocales(item.titleKey),
        ...(item.descKey ? getTranslationsForAllLocales(item.descKey) : []),
      ];
      if (texts.some((txt) => txt.toLowerCase().includes(query))) {
        set.add(item.tabId);
      }
    });

    return set;
  }, [searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!matchingTabIds) return TAB_GROUPS;

    return TAB_GROUPS.map((group) => {
      const ids = group.ids.filter((id) => matchingTabIds.has(id));
      return { ...group, ids };
    }).filter((group) => group.ids.length > 0);
  }, [matchingTabIds]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    if (matchingTabIds && matchingTabIds.size > 0 && !matchingTabIds.has(activeTab)) {
      const firstMatch = TAB_GROUPS.flatMap((g) => g.ids).find((id) => matchingTabIds.has(id));
      if (firstMatch) {
        setActiveTab(firstMatch);
      }
    }
  }, [searchQuery, matchingTabIds, activeTab]);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const displayName =
    user?.displayName ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "SpoPlayer";
  const handle = user?.username ? `@${user.username}` : (user?.email ?? t("settings.manage_account"));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (!next ? handleClose() : undefined)}
      maxWidth={920}
      className="p-0 h-[640px] max-h-[88vh] !flex-row overflow-hidden !bg-[#070c09] !border !border-[var(--accent-primary,#00f59b)]/25 !rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_40px_rgba(0,245,155,0.06)]"
    >
      <aside className="w-[260px] shrink-0 flex flex-col min-h-0 bg-[#050806]/80 border-r border-white/[0.06] backdrop-blur-2xl">
        {/* Header de la barra de ajustes */}
        <div className="flex items-center justify-between px-[16px] pt-[18px] pb-[12px] shrink-0">
          <div className="flex items-center gap-[8px]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary,#00f59b)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent-primary,#00f59b)] shadow-[0_0_8px_var(--accent-primary,#00f59b)]" />
            </span>
            <span
              className="text-[12.5px] font-bold tracking-wider text-[var(--accent-primary,#00f59b)] uppercase"
              style={font}
            >
              {t("settings.title") || "Ajustes"}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-text-tertiary border border-white/[0.08]">
            SpoPlayer
          </span>
        </div>

        {/* Buscador de ajustes estilizado */}
        <div className="px-[12px] pb-[10px] shrink-0">
          <div className="relative flex items-center group">
            <Search2Line
              size={15}
              className="absolute left-[11px] text-text-tertiary group-focus-within:text-[var(--accent-primary,#00f59b)] transition-colors pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("settings.search_placeholder") || "Buscar ajustes..."}
              className="w-full h-[34px] pl-[34px] pr-[28px] bg-white/[0.03] text-text-primary text-[12.5px] rounded-xl border border-white/[0.08] outline-none placeholder:text-text-tertiary/60 focus:border-[var(--accent-primary,#00f59b)]/50 focus:bg-white/[0.06] focus:shadow-[0_0_15px_rgba(0,245,155,0.12)] transition-all"
              style={font}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-[8px] p-0 border-0 bg-transparent text-text-tertiary hover:text-text-primary cursor-pointer flex items-center justify-center"
              >
                <CloseCircleFill size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de pestaÃ±as */}
        <nav
          className="flex-1 min-h-0 overflow-y-auto px-[10px] pb-[12px] flex flex-col gap-[14px]"
          role="tablist"
          aria-label={t("settings.title")}
        >
          {filteredGroups.length === 0 ? (
            <p className="text-text-tertiary text-[12px] px-[12px] py-[8px] m-0" style={font}>
              {t("search.no_results") || "No se encontraron resultados"}
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.labelKey} className="flex flex-col gap-[3px]">
                <div className="flex items-center gap-[8px] px-[10px] pb-[4px] pt-[4px]">
                  <span
                    className="text-text-tertiary/75 text-[10.5px] font-bold uppercase tracking-widest select-none"
                    style={font}
                  >
                    {t(`settings.groups.${group.labelKey}`)}
                  </span>
                  <div className="flex-1 h-[1px] bg-white/[0.06]" />
                </div>
                {group.ids.map((id) => {
                  const isActive = id === activeTab;
                  const Icon = TAB_ICONS[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(id)}
                      className={`group relative w-full flex items-center gap-[10px] px-[10px] py-[8px] rounded-xl border transition-all duration-150 cursor-pointer text-left select-none ${
                        isActive
                          ? "bg-gradient-to-r from-[var(--accent-primary,#00f59b)]/18 via-[var(--accent-primary,#00f59b)]/10 to-transparent text-white border-[var(--accent-primary,#00f59b)]/35 shadow-[0_0_16px_rgba(0,245,155,0.08)] font-medium"
                          : "bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-white/[0.04] hover:border-white/[0.05]"
                      }`}
                      style={font}
                    >
                      <div
                        className={`w-[28px] h-[28px] rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isActive
                            ? "bg-[var(--accent-primary,#00f59b)] text-black shadow-[0_0_10px_var(--accent-primary,#00f59b)]"
                            : "bg-white/[0.04] text-text-tertiary group-hover:text-[var(--accent-primary,#00f59b)] group-hover:bg-[var(--accent-primary,#00f59b)]/12"
                        }`}
                      >
                        <Icon size={16} weight="Bold" className="shrink-0" />
                      </div>
                      <span className="truncate text-[13px] leading-none flex-1">
                        {tabLabels[id]}
                      </span>
                      {isActive && (
                        <span className="w-[5px] h-[5px] rounded-full bg-[var(--accent-primary,#00f59b)] shadow-[0_0_6px_var(--accent-primary,#00f59b)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        {/* Tarjeta de usuario en el pie de la barra de ajustes */}
        <div className="shrink-0 p-[10px]">
          <div className="flex items-center gap-[10px] p-[8px] rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-[var(--accent-primary,#00f59b)]/30 transition-all">
            <span className="relative shrink-0">
              <UserAvatar user={user ?? null} size={32} />
              <span
                className="absolute right-[-1px] bottom-[-1px] w-[9px] h-[9px] rounded-full bg-[var(--accent-primary,#00f59b)] border-2 border-[#050806] shadow-[0_0_6px_var(--accent-primary,#00f59b)]"
                aria-hidden
              />
            </span>
            <div className="flex-1 min-w-0 flex flex-col leading-tight">
              <span
                className="text-text-primary text-[12.5px] font-semibold truncate"
                style={font}
              >
                {displayName}
              </span>
              <span
                className="text-text-tertiary text-[11px] truncate mt-[1px]"
                style={font}
              >
                {handle}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                handleClose();
                await logout();
              }}
              title={t("settings.profile.sign_out") || "Cerrar sesiÃ³n"}
              aria-label={t("settings.profile.sign_out") || "Cerrar sesiÃ³n"}
              className="w-[28px] h-[28px] rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              <ExitLine size={15} className="shrink-0" />
            </button>
          </div>
        </div>
      </aside>

      {/* Panel de contenido derecho */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-transparent overflow-hidden">
        {/* Cabecera del panel */}
        <div className="flex items-start justify-between gap-[16px] px-[26px] pt-[20px] pb-[14px] shrink-0 border-b border-white/[0.05]">
          <div className="min-w-0 flex flex-col gap-[3px]">
            <span className="inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-md bg-[var(--accent-primary,#00f59b)]/12 border border-[var(--accent-primary,#00f59b)]/25 text-[var(--accent-primary,#00f59b)] text-[10.5px] font-bold tracking-wider uppercase w-fit">
              {tabLabels[activeTab]}
            </span>
            <h3
              className="text-text-primary text-[18px] m-0 font-bold tracking-tight"
              style={font}
            >
              {tabLabels[activeTab]}
            </h3>
            <p
              className="text-text-tertiary text-[12.5px] m-0 leading-relaxed max-w-[540px]"
              style={font}
            >
              {tabDescriptions[activeTab]}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("common.close") || "Close"}
            onClick={handleClose}
            className="w-[32px] h-[32px] shrink-0 inline-flex items-center justify-center rounded-xl text-text-tertiary hover:text-text-primary hover:bg-white/[0.08] hover:border-white/[0.12] border border-transparent transition-all p-0 cursor-pointer group active:scale-95"
          >
            <CloseLine size={18} className="group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* Vista scrolleable con pestaÃ±as */}
        <div className="flex-1 min-h-0 overflow-y-auto px-[26px] py-[16px] flex flex-col">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            {activeTab === "Playback" && <PlaybackTab searchQuery={searchQuery} />}
            {activeTab === "Shortcuts" && <ShortcutsTab searchQuery={searchQuery} />}
            {activeTab === "Overlay" && <OverlayTab searchQuery={searchQuery} />}
            {activeTab === "Appearance" && <AppearanceTab searchQuery={searchQuery} />}
            {activeTab === "Customization" && <CustomizationTab searchQuery={searchQuery} />}
            {activeTab === "Audio" && <AudioTab searchQuery={searchQuery} />}
            {activeTab === "Storage" && <StorageTab searchQuery={searchQuery} />}
          </motion.div>
        </div>
      </div>
    </Dialog>
  );
}
