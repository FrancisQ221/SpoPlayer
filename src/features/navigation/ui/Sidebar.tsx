import { memo, useMemo, useState } from "react";
import AppImage from "@/features/covers/ui/AppImage";
import CoverImage from "@/features/covers/ui/CoverImage";
import { Link, useLocation } from "react-router-dom";
import { sidebarNavItems } from "../data/navigation";
import logo from "@/assets/spoplayer-logo.png";
import { useTranslation } from "@/languages";
import { useTheme } from "next-themes";
import {
  useModalStore,
  usePlaylistsList,
  useExternalItems,
  useLikedTrackCount,
} from "@/features/library";
import {
  useCustomizationStore,
  getBlockStyle,
  useDynamicLogo,
} from "@/features/settings";
import { Tooltip } from "@/shared/ui";
import {
  LayoutLeftLine,
  AddLine,
  LinkLine,
  HeartFill,
  PlaylistFill,
  ChartBarLine,
} from "@mingcute/react";

export interface SidebarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  isEdgeToEdge?: boolean;
}

function Sidebar({
  isExpanded,
  onToggleExpand,
  isEdgeToEdge = false,
}: SidebarProps) {
  const location = useLocation();
  const { pathname, search } = location;
  const { t } = useTranslation();
  const openStats = useModalStore((state) => state.openStats);
  const settingsOpen = useModalStore((state) => state.settingsOpen);
  const toggleSettings = useModalStore((state) => state.toggleSettings);
  const openCreatePlaylist = useModalStore((state) => state.openCreatePlaylist);
  const openImportPlaylist = useModalStore((state) => state.openImportPlaylist);

  const { data: playlistsData } = usePlaylistsList();
  const { data: externalPlaylists = [] } = useExternalItems("playlist");
  const { data: likedCount } = useLikedTrackCount();
  const { logoSrc, accentColor } = useDynamicLogo();

  const isLikesActive = pathname === "/library/playlist" && search.includes("id=likes");

  const isItemHrefActive = (href: string) => {
    if (href.startsWith("/library/playlist?id=")) {
      const id = href.split("id=")[1];
      return pathname === "/library/playlist" && search.includes(`id=${id}`);
    }
    if (href.startsWith("/collection?")) {
      return pathname === "/collection" && search === href.replace("/collection", "");
    }
    return pathname + search === href;
  };

  const { appPlaylists, importedPlaylists } = useMemo(() => {
    const list = playlistsData?.playlists ?? [];
    let importedIds: string[] = [];
    try {
      importedIds = JSON.parse(localStorage.getItem("spoplayer:imported-playlists") || "[]");
    } catch {}

    const isImported = (p: { id: string; description?: string }) => {
      if (importedIds.includes(p.id)) return true;
      if (p.description && /import/i.test(p.description)) return true;
      return false;
    };

    const appCreated = list.filter((p) => !isImported(p)).map((p) => ({
      id: p.id,
      title: p.title,
      trackCount: p.trackCount,
      coverUrl: p.coverUrl || (p.coverUrls && p.coverUrls[0]) || "",
      href: `/library/playlist?id=${encodeURIComponent(p.id)}`,
    }));

    const importedOwned = list.filter((p) => isImported(p)).map((p) => ({
      id: p.id,
      title: p.title,
      trackCount: p.trackCount,
      coverUrl: p.coverUrl || (p.coverUrls && p.coverUrls[0]) || "",
      href: `/library/playlist?id=${encodeURIComponent(p.id)}`,
    }));

    const importedExternal = externalPlaylists.map((p) => ({
      id: p.id,
      title: p.title,
      trackCount: p.trackCount || 0,
      coverUrl: p.imageUrl || "",
      href: p.href || `/collection?type=playlist&id=${encodeURIComponent(p.id)}`,
    }));

    const allImported = [...importedOwned];
    for (const ext of importedExternal) {
      if (!allImported.some((it) => it.id === ext.id)) {
        allImported.push(ext);
      }
    }

    return { appPlaylists: appCreated, importedPlaylists: allImported };
  }, [playlistsData, externalPlaylists]);

  const isRouteActive = (href: string) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const isItemActive = (id: string, href?: string) => {
    if (id === "settings") {
      return settingsOpen;
    }
    return href ? isRouteActive(href) : false;
  };

  const { resolvedTheme } = useTheme();
  const isDark =
    resolvedTheme
      ? resolvedTheme === "dark"
      : typeof document !== "undefined" &&
        (document.documentElement.getAttribute("data-theme") === "dark" ||
          (!document.documentElement.getAttribute("data-theme") &&
            window.matchMedia?.("(prefers-color-scheme: dark)")?.matches));
  const backgroundImage = useCustomizationStore(
    (state) => state.backgroundImage,
  );
  const sidebarConfig = useCustomizationStore((state) => state.sidebar);
  const hasCustomBg = Boolean(backgroundImage && isDark);


  const renderNavItems = () =>
    sidebarNavItems
      .filter((item) => item.id !== "settings")
      .map((item) => {
        const active = isItemActive(item.id, item.href);
        const Icon = item.Icon;
        const tooltipLabel =
          t(`common.sidebar.${item.id}`) || item.label || "Biblioteca";

        const itemContent = (
          <Link
            key={item.id}
            to={item.href!}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center ${
              isExpanded ? "justify-start gap-[12px] px-3.5" : "justify-center"
            } w-full h-[44px] rounded-xl cursor-pointer active:scale-[0.97] transition-all duration-150 ${
              active
                ? "spoplayer-active-indicator bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] font-semibold border border-[var(--accent-primary,#00f59b)]/30 shadow-[0_0_15px_var(--bg-toolbox-active)]"
                : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            }`}
          >
            <Icon
              size={24}
              className={`shrink-0 transition-colors duration-150 ${
                active
                  ? "text-[var(--accent-primary,#00f59b)]"
                  : "text-text-secondary group-hover:text-text-primary"
              }`}
            />
            {isExpanded && (
              <span className="text-[14px] font-medium truncate select-none">
                {tooltipLabel}
              </span>
            )}
          </Link>
        );

        if (isExpanded) {
          return itemContent;
        }

        return (
          <Tooltip
            key={item.id}
            content={tooltipLabel}
            side="right"
            sideOffset={12}
          >
            {itemContent}
          </Tooltip>
        );
      });

  const renderSettingsButton = () => {
    const settingsItem = sidebarNavItems.find((item) => item.id === "settings");
    if (!settingsItem) return null;
    const Icon = settingsItem.Icon;
    const tooltipLabel =
      t("common.sidebar.settings") || settingsItem.label || "Configuración";

    const buttonContent = (
      <button
        type="button"
        aria-pressed={settingsOpen}
        onClick={toggleSettings}
        className={`group relative flex items-center ${
          isExpanded
            ? "justify-between gap-[10px] px-3 py-2 h-auto w-full rounded-2xl"
            : "justify-center h-[42px] w-full rounded-xl"
        } border cursor-pointer active:scale-[0.97] transition-all duration-200 ${
          settingsOpen
            ? "spoplayer-active-indicator bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] font-semibold border-[var(--accent-primary,#00f59b)]/40 shadow-[0_0_20px_var(--bg-toolbox-active)]"
            : "bg-white/[0.03] hover:bg-white/[0.06] text-text-secondary hover:text-text-primary border-white/[0.08] hover:border-[var(--accent-primary,#00f59b)]/35 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-[10px] min-w-0">
          <div
            className={`flex items-center justify-center shrink-0 transition-all ${
              isExpanded
                ? "w-[30px] h-[30px] rounded-xl " +
                  (settingsOpen
                    ? "bg-[var(--accent-primary,#00f59b)] text-black shadow-[0_0_10px_var(--accent-primary,#00f59b)]"
                    : "bg-white/[0.06] text-text-secondary group-hover:bg-[var(--accent-primary,#00f59b)]/20 group-hover:text-[var(--accent-primary,#00f59b)]")
                : ""
            }`}
          >
            <Icon
              size={isExpanded ? 18 : 22}
              className={`shrink-0 transition-all duration-200 ${
                settingsOpen
                  ? isExpanded
                    ? "text-black"
                    : "text-[var(--accent-primary,#00f59b)]"
                  : "group-hover:scale-110"
              }`}
            />
          </div>
          {isExpanded && (
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <span className="text-[13px] font-semibold text-text-primary group-hover:text-[var(--accent-primary,#00f59b)] truncate select-none transition-colors">
                {tooltipLabel}
              </span>
              <span className="text-[10.5px] text-text-tertiary truncate select-none">
                {t("settings.manage_account") || "Preferencias & Audio"}
              </span>
            </div>
          )}
        </div>
        {isExpanded && (
          <span
            className={`w-[6px] h-[6px] rounded-full shrink-0 transition-all ${
              settingsOpen
                ? "bg-[var(--accent-primary,#00f59b)] shadow-[0_0_8px_var(--accent-primary,#00f59b)] scale-125"
                : "bg-white/20 group-hover:bg-[var(--accent-primary,#00f59b)]/70"
            }`}
          />
        )}
      </button>
    );

    if (isExpanded) {
      return buttonContent;
    }

    return (
      <Tooltip content={tooltipLabel} side="right" sideOffset={12}>
        {buttonContent}
      </Tooltip>
    );
  };

  const renderStatsButton = () => {
    const button = (
      <button
        type="button"
        onClick={openStats}
        className={`group relative flex items-center ${
          isExpanded
            ? "justify-between gap-[10px] px-3 py-2 h-auto w-full rounded-2xl"
            : "justify-center h-[42px] w-full rounded-xl"
        } border cursor-pointer active:scale-[0.97] transition-all duration-200 bg-white/[0.03] hover:bg-white/[0.06] text-text-secondary hover:text-text-primary border-white/[0.08] hover:border-[var(--accent-primary,#00f59b)]/35 shadow-sm`}
      >
        <div className="flex items-center gap-[10px] min-w-0">
          <div
            className={`flex items-center justify-center shrink-0 transition-all ${
              isExpanded
                ? "w-[30px] h-[30px] rounded-xl bg-white/[0.06] text-[var(--accent-primary,#00f59b)] group-hover:bg-[var(--accent-primary,#00f59b)]/20 shadow-[0_0_8px_var(--bg-toolbox-active)]"
                : ""
            }`}
          >
            <ChartBarLine
              size={isExpanded ? 18 : 22}
              className="shrink-0 text-[var(--accent-primary,#00f59b)] group-hover:scale-110 transition-transform duration-200"
            />
          </div>
          {isExpanded && (
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <span className="text-[13px] font-semibold text-text-primary group-hover:text-[var(--accent-primary,#00f59b)] truncate select-none transition-colors">
                Cápsula Musical
              </span>
              <span className="text-[10.5px] text-text-tertiary truncate select-none">
                Estadísticas en vivo
              </span>
            </div>
          )}
        </div>
        {isExpanded && (
          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] border border-[var(--accent-primary,#00f59b)]/30 uppercase tracking-wider">
            En vivo
          </span>
        )}
      </button>
    );

    if (isExpanded) return button;
    return (
      <Tooltip content="Cápsula Musical (Estadísticas en vivo)" side="right" sideOffset={12}>
        {button}
      </Tooltip>
    );
  };

  const renderActionButtons = () => {
    const createBtn = (
      <button
        type="button"
        onClick={() => openCreatePlaylist()}
        className={`group relative flex items-center ${
          isExpanded ? "justify-start gap-[12px] px-3 py-[7px] h-auto" : "justify-center h-[44px]"
        } w-full rounded-xl bg-transparent border-0 cursor-pointer active:scale-[0.97] transition-all duration-150 text-text-secondary hover:text-[var(--accent-primary,#00f59b)] hover:bg-[var(--accent-primary,#00f59b)]/10`}
      >
        <div
          className={`shrink-0 flex items-center justify-center ${
            isExpanded
              ? "w-[32px] h-[32px] rounded-lg bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] group-hover:bg-[var(--accent-primary,#00f59b)] group-hover:text-black shadow-[0_0_10px_var(--bg-toolbox-active)]"
              : ""
          } transition-all duration-150`}
        >
          <AddLine
            size={isExpanded ? 18 : 24}
            className={`transition-colors duration-150 ${
              isExpanded
                ? ""
                : "text-text-secondary group-hover:text-[var(--accent-primary,#00f59b)]"
            }`}
          />
        </div>
        {isExpanded && (
          <div className="flex flex-col text-left overflow-hidden min-w-0">
            <span className="text-[13px] font-semibold text-text-primary group-hover:text-[var(--accent-primary,#00f59b)] truncate select-none transition-colors">
              {t("common.sidebar.create_playlist") || "Crear playlist"}
            </span>
            <span className="text-[11px] text-text-tertiary truncate select-none">
              {t("common.sidebar.create_playlist_desc") || "Crea una lista desde cero"}
            </span>
          </div>
        )}
      </button>
    );

    const importBtn = (
      <button
        type="button"
        onClick={() => openImportPlaylist()}
        className={`group relative flex items-center ${
          isExpanded ? "justify-start gap-[12px] px-3 py-[7px] h-auto" : "justify-center h-[44px]"
        } w-full rounded-xl bg-transparent border-0 cursor-pointer active:scale-[0.97] transition-all duration-150 text-text-secondary hover:text-[var(--accent-primary,#00f59b)] hover:bg-[var(--accent-primary,#00f59b)]/10`}
      >
        <div
          className={`shrink-0 flex items-center justify-center ${
            isExpanded
              ? "w-[32px] h-[32px] rounded-lg bg-white/[0.06] text-text-secondary group-hover:bg-[var(--accent-primary,#00f59b)]/20 group-hover:text-[var(--accent-primary,#00f59b)]"
              : ""
          } transition-all duration-150`}
        >
          <LinkLine
            size={isExpanded ? 18 : 24}
            className={`transition-colors duration-150 ${
              isExpanded
                ? ""
                : "text-text-secondary group-hover:text-[var(--accent-primary,#00f59b)]"
            }`}
          />
        </div>
        {isExpanded && (
          <div className="flex flex-col text-left overflow-hidden min-w-0">
            <span className="text-[13px] font-semibold text-text-primary group-hover:text-[var(--accent-primary,#00f59b)] truncate select-none transition-colors">
              {t("common.sidebar.import_playlist") || "Importar desde otra app"}
            </span>
            <span className="text-[11px] text-text-tertiary truncate select-none">
              {t("common.sidebar.import_playlist_desc") || "Spotify, YouTube, etc."}
            </span>
          </div>
        )}
      </button>
    );

    if (isExpanded) {
      return (
        <div className="flex flex-col gap-[4px] pt-[2px]">
          {createBtn}
          {importBtn}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-[8px] pt-[2px]">
        <Tooltip
          content="Crear playlist: Crea una lista desde cero"
          side="right"
          sideOffset={12}
        >
          {createBtn}
        </Tooltip>
        <Tooltip
          content="Importar desde otra app: Spotify, YouTube, etc."
          side="right"
          sideOffset={12}
        >
          {importBtn}
        </Tooltip>
      </div>
    );
  };

  return (
    <aside className="h-full">
      <div
        className={`h-full w-full ${
          isEdgeToEdge ? "rounded-l-none" : "rounded-l-xl"
        } rounded-r-sm bg-[#080d0b] border-r border-[var(--accent-primary,#00f59b)]/15 flex flex-col overflow-hidden transition-all duration-300 ease-in-out shadow-2xl`}
      >
        {/* 1. Header con Logo clicable que lleva a Inicio + Nombre SpoPlayer en verde Esmeralda brilloso */}
        <div
          className={`flex items-center pt-[18px] pb-[16px] px-[14px] shrink-0 ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
        >
          <Link
            to="/"
            className="flex items-center gap-[12px] no-underline group cursor-pointer overflow-hidden"
            title="SpoPlayer - Inicio"
          >
            <div className="relative w-[38px] h-[38px] shrink-0">
              <AppImage
                src={logoSrc}
                alt="SpoPlayer Logo"
                width={38}
                height={38}
                className="w-[38px] h-[38px] rounded-xl object-contain group-hover:scale-105 group-hover:brightness-110 transition-all duration-300 shrink-0 shadow-[0_0_12px_var(--border-white-alpha-33)]"
                draggable={false}
              />
            </div>
            {isExpanded && (
              <span
                style={{
                  color: accentColor,
                  filter: `drop-shadow(0 0 14px ${accentColor}55)`,
                }}
                className="font-black text-[21px] tracking-tight select-none truncate transition-colors duration-300"
              >
                SpoPlayer
              </span>
            )}
          </Link>
        </div>

        {/* 2. Botón abajo del logo y nombre, arriba de Biblioteca */}
        <div className="px-[10px] pb-[14px] shrink-0">
          {isExpanded ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-full flex items-center justify-start gap-[10px] px-3 h-[40px] rounded-xl bg-white/[0.04] hover:bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] border border-[var(--accent-primary,#00f59b)]/30 hover:border-[var(--accent-primary,#00f59b)]/60 transition-all duration-150 cursor-pointer group active:scale-[0.97]"
              title={t("common.sidebar.collapse") || "Contraer barra lateral"}
            >
              <LayoutLeftLine
                size={20}
                className="shrink-0 text-[var(--accent-primary,#00f59b)] group-hover:scale-110 transition-transform"
              />
              <span className="text-[12px] font-semibold text-[var(--accent-primary,#00f59b)] truncate select-none">
                {t("common.sidebar.collapse") || "Contraer barra lateral"}
              </span>
            </button>
          ) : (
            <Tooltip
              content={t("common.sidebar.expand") || "Expandir barra lateral"}
              side="right"
              sideOffset={12}
            >
              <button
                type="button"
                onClick={onToggleExpand}
                className="w-full flex items-center justify-center h-[40px] rounded-xl bg-white/[0.04] hover:bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] border border-[var(--accent-primary,#00f59b)]/30 hover:border-[var(--accent-primary,#00f59b)]/60 transition-all duration-150 cursor-pointer group active:scale-[0.97]"
                title={t("common.sidebar.expand") || "Expandir barra lateral"}
              >
                <LayoutLeftLine
                  size={20}
                  className="shrink-0 text-[var(--accent-primary,#00f59b)] group-hover:scale-110 transition-transform"
                />
              </button>
            </Tooltip>
          )}
        </div>

        {/* 3. Navegación principal, Acciones, Acceso Rápido y Playlists */}
        <nav className="relative flex-1 flex flex-col gap-[6px] px-[10px] pt-[2px] overflow-y-auto no-scrollbar pb-3">
          {renderNavItems()}
          <div className="my-[2px] h-[1px] bg-white/[0.08] mx-[4px]" />
          {renderActionButtons()}

          {/* ── ACCESO RÁPIDO: Mis Me Gustas ── */}
          <div className="my-[3px] h-[1px] bg-white/[0.08] mx-[4px]" />
          <div className="flex flex-col gap-[2px]">
            {isExpanded && (
              <div className="px-3 pt-1 pb-1 text-[10.5px] font-bold text-text-tertiary tracking-wider uppercase select-none">
                Acceso rápido
              </div>
            )}
            {(() => {
              const likesContent = (
                <Link
                  to="/library/playlist?id=likes"
                  aria-current={isLikesActive ? "page" : undefined}
                  className={`group relative flex items-center ${
                    isExpanded ? "justify-start gap-[12px] px-3.5 h-[42px]" : "justify-center h-[44px]"
                  } w-full rounded-xl cursor-pointer active:scale-[0.97] transition-all duration-150 ${
                    isLikesActive
                      ? "spoplayer-active-indicator bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] font-semibold border border-[var(--accent-primary,#00f59b)]/30 shadow-[0_0_15px_var(--bg-toolbox-active)]"
                      : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
                  }`}
                >
                  <div
                    className={`shrink-0 flex items-center justify-center ${
                      isExpanded
                        ? "w-[28px] h-[28px] rounded-lg bg-gradient-to-br from-[var(--accent-primary,#00f59b)] to-[var(--accent-secondary,#00b06f)] text-black shadow-[0_0_10px_var(--bg-toolbox-active)]"
                        : ""
                    }`}
                  >
                    <HeartFill
                      size={isExpanded ? 16 : 22}
                      className={
                        isExpanded
                          ? "text-black"
                          : isLikesActive
                            ? "text-[var(--accent-primary,#00f59b)]"
                            : "text-[var(--accent-primary,#00f59b)] group-hover:scale-110 transition-transform"
                      }
                    />
                  </div>
                  {isExpanded && (
                    <div className="flex flex-col text-left overflow-hidden min-w-0">
                      <span className="text-[13px] font-semibold text-text-primary group-hover:text-[var(--accent-primary,#00f59b)] truncate select-none transition-colors">
                        {t("common.sidebar.likes") || "Mis Me Gustas"}
                      </span>
                      <span className="text-[11px] text-text-tertiary truncate select-none">
                        {likedCount !== undefined
                          ? `${likedCount} ${likedCount === 1 ? t("common.song") || "canción" : t("common.songs") || "canciones"}`
                          : (t("common.sidebar.favorites") || "Favoritos")}
                      </span>
                    </div>
                  )}
                </Link>
              );

              if (isExpanded) return likesContent;

              return (
                <Tooltip
                  content={`${t("common.sidebar.likes") || "Mis Me Gustas"}${likedCount !== undefined ? ` (${likedCount})` : ""}`}
                  side="right"
                  sideOffset={12}
                >
                  {likesContent}
                </Tooltip>
              );
            })()}
          </div>

          {/* ── HECHAS EN LA APP ── */}
          <div className="my-[3px] h-[1px] bg-white/[0.08] mx-[4px]" />
          <div className="flex flex-col gap-[2px]">
            {isExpanded && (
              <div className="px-3 pt-1 pb-1 text-[10.5px] font-bold text-text-tertiary tracking-wider uppercase select-none">
                {t("common.sidebar.created_in_app") || "Hechas en la app"}
              </div>
            )}
            {appPlaylists.length === 0 ? (
              isExpanded && (
                <div className="px-3.5 py-1 text-[11.5px] text-text-tertiary select-none italic">
                  {t("common.sidebar.empty_created") || "Sin playlists creadas"}
                </div>
              )
            ) : (
              appPlaylists.map((pl) => {
                const active = isItemHrefActive(pl.href);
                const countText = `${pl.trackCount} ${pl.trackCount === 1 ? t("common.song") || "canción" : t("common.songs") || "canciones"}`;
                const item = (
                  <Link
                    key={pl.id}
                    to={pl.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center ${
                      isExpanded ? "justify-start gap-[10px] px-3 h-[38px]" : "justify-center h-[42px]"
                    } w-full rounded-xl cursor-pointer active:scale-[0.97] transition-all duration-150 ${
                      active
                        ? "spoplayer-active-indicator bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] font-semibold border border-[var(--accent-primary,#00f59b)]/30 shadow-[0_0_15px_var(--bg-toolbox-active)]"
                        : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="shrink-0 flex items-center justify-center w-[26px] h-[26px] rounded-md overflow-hidden bg-white/[0.06]">
                      {pl.coverUrl ? (
                        <CoverImage src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
                      ) : (
                        <PlaylistFill size={15} className={active ? "text-[var(--accent-primary,#00f59b)]" : "text-text-tertiary group-hover:text-text-primary"} />
                      )}
                    </div>
                    {isExpanded && (
                      <div className="flex flex-col text-left overflow-hidden min-w-0">
                        <span className="text-[12.5px] font-medium text-text-primary group-hover:text-[var(--accent-primary,#00f59b)] truncate select-none transition-colors">
                          {pl.title}
                        </span>
                        <span className="text-[10.5px] text-text-tertiary truncate select-none">
                          {countText}
                        </span>
                      </div>
                    )}
                  </Link>
                );

                if (isExpanded) return item;

                return (
                  <Tooltip key={pl.id} content={`${pl.title} (${countText})`} side="right" sideOffset={12}>
                    {item}
                  </Tooltip>
                );
              })
            )}
          </div>

          {/* ── IMPORTADAS DESDE OTRA APP ── */}
          <div className="my-[3px] h-[1px] bg-white/[0.08] mx-[4px]" />
          <div className="flex flex-col gap-[2px]">
            {isExpanded && (
              <div className="px-3 pt-1 pb-1 text-[10.5px] font-bold text-text-tertiary tracking-wider uppercase select-none">
                {t("common.sidebar.imported_playlists") || "Importadas desde otra app"}
              </div>
            )}
            {importedPlaylists.length === 0 ? (
              isExpanded && (
                <div className="px-3.5 py-1 text-[11.5px] text-text-tertiary select-none italic">
                  {t("common.sidebar.empty_imported") || "Sin playlists importadas"}
                </div>
              )
            ) : (
              importedPlaylists.map((pl) => {
                const active = isItemHrefActive(pl.href);
                const countText = pl.trackCount
                  ? `${pl.trackCount} ${pl.trackCount === 1 ? t("common.song") || "canción" : t("common.songs") || "canciones"} • ${t("common.sidebar.imported") || "Importada"}`
                  : (t("common.sidebar.imported") || "Importada");
                const item = (
                  <Link
                    key={pl.id}
                    to={pl.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center ${
                      isExpanded ? "justify-start gap-[10px] px-3 h-[38px]" : "justify-center h-[42px]"
                    } w-full rounded-xl cursor-pointer active:scale-[0.97] transition-all duration-150 ${
                      active
                        ? "spoplayer-active-indicator bg-[var(--accent-primary,#00f59b)]/15 text-[var(--accent-primary,#00f59b)] font-semibold border border-[var(--accent-primary,#00f59b)]/30 shadow-[0_0_15px_var(--bg-toolbox-active)]"
                        : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="shrink-0 flex items-center justify-center w-[26px] h-[26px] rounded-md overflow-hidden bg-white/[0.06]">
                      {pl.coverUrl ? (
                        <CoverImage src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
                      ) : (
                        <LinkLine size={15} className={active ? "text-[var(--accent-primary,#00f59b)]" : "text-[var(--accent-primary,#00f59b)]/70"} />
                      )}
                    </div>
                    {isExpanded && (
                      <div className="flex flex-col text-left overflow-hidden min-w-0">
                        <span className="text-[12.5px] font-medium text-text-primary group-hover:text-[var(--accent-primary,#00f59b)] truncate select-none transition-colors">
                          {pl.title}
                        </span>
                        <span className="text-[10.5px] text-text-tertiary truncate select-none">
                          {countText}
                        </span>
                      </div>
                    )}
                  </Link>
                );

                if (isExpanded) return item;

                return (
                  <Tooltip key={pl.id} content={`${pl.title} (${t("common.sidebar.imported") || "Importada"})`} side="right" sideOffset={12}>
                    {item}
                  </Tooltip>
                );
              })
            )}
          </div>
        </nav>

        {/* 4. Cápsula musical & Configuración */}
        <div className="pt-[10px] pb-[16px] px-[10px] shrink-0 flex flex-col gap-2 justify-center items-center">
          {renderStatsButton()}
          {renderSettingsButton()}
        </div>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
