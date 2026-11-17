import { useState, useRef, useCallback } from "react";
import {
  Gallery,
  TrashBin2,
  Refresh,
} from "@solar-icons/react";
import { Upload2Line, CopyLine, CheckLine, SparklesLine } from "@mingcute/react";

import { useTranslation } from "@/languages";
import { useTheme } from "next-themes";
import { Button, Slider, ToggleSwitch, useToast } from "@/shared/ui";
import {
  SettingBlock,
  SettingRow,
  SettingSection,
  SegmentedControl,
} from "../controls";
import {
  useCustomizationStore,
  MIN_OPACITY,
  MAX_OPACITY,
  MIN_BLUR,
  MAX_BLUR,
  MIN_DIM,
  MAX_DIM,
} from "../../store/customizationStore";
import {
  WALLPAPER_THEMES,
  type WallpaperTheme,
} from "../../data/wallpaperThemes";
import {
  buildPaletteFromHex,
  applyDynamicPalette,
} from "../../lib/extractPalette";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;

type BlockTarget = "sidebar" | "contentView" | "miniplayer";

function ThemeLogoSvg({
  accentColor,
  gradient,
  size = 36,
}: {
  accentColor: string;
  gradient?: [string, string];
  size?: number;
}) {
  const gradId = `theme-logo-${accentColor.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-md rounded-lg overflow-hidden"
    >
      {gradient && (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradient[0]} />
            <stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
      )}
      <rect
        width="512"
        height="512"
        rx="112"
        fill={gradient ? `url(#${gradId})` : accentColor}
      />
      <g fill="#07130E">
        <rect x="68" y="168" width="47" height="176" rx="23.5" />
        <rect x="150" y="86" width="47" height="340" rx="23.5" />
        <rect x="232.5" y="141" width="47" height="230" rx="23.5" />
        <rect x="315" y="67" width="47" height="378" rx="23.5" />
        <rect x="397.5" y="196" width="47" height="120" rx="23.5" />
      </g>
    </svg>
  );
}

export function CustomizationTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeBlock, setActiveBlock] = useState<BlockTarget>("contentView");
  const [isDragOver, setIsDragOver] = useState(false);

  const backgroundImage = useCustomizationStore((s) => s.backgroundImage);
  const backgroundBlur = useCustomizationStore((s) => s.backgroundBlur);
  const backgroundDim = useCustomizationStore((s) => s.backgroundDim);
  const dynamicAccent = useCustomizationStore((s) => s.dynamicAccent);
  const wallpaperAccentColor = useCustomizationStore((s) => s.wallpaperAccentColor);
  const sidebar = useCustomizationStore((s) => s.sidebar);
  const contentView = useCustomizationStore((s) => s.contentView);
  const miniplayer = useCustomizationStore((s) => s.miniplayer);

  const setBackgroundImage = useCustomizationStore((s) => s.setBackgroundImage);
  const setBackgroundBlur = useCustomizationStore((s) => s.setBackgroundBlur);
  const setBackgroundDim = useCustomizationStore((s) => s.setBackgroundDim);
  const setDynamicAccent = useCustomizationStore((s) => s.setDynamicAccent);
  const setWallpaperAccentColor = useCustomizationStore((s) => s.setWallpaperAccentColor);
  const setBlockConfig = useCustomizationStore((s) => s.setBlockConfig);
  const applyToAllBlocks = useCustomizationStore((s) => s.applyToAllBlocks);
  const resetBlock = useCustomizationStore((s) => s.resetBlock);
  const resetAll = useCustomizationStore((s) => s.resetAll);

  const { resolvedTheme, setTheme } = useTheme();
  const isDark =
    resolvedTheme
      ? resolvedTheme === "dark"
      : typeof document !== "undefined" &&
        (document.documentElement.getAttribute("data-theme") === "dark" ||
          (!document.documentElement.getAttribute("data-theme") &&
            window.matchMedia?.("(prefers-color-scheme: dark)")?.matches));

  const handleSelectTheme = (themeItem: WallpaperTheme) => {
    if (resolvedTheme !== "dark") {
      setTheme("dark");
    }

    setBackgroundImage(themeItem.image);
    setBackgroundBlur(themeItem.recommendedBlur);
    setBackgroundDim(themeItem.recommendedDim);
    setDynamicAccent(true);
    setWallpaperAccentColor(themeItem.accentColor);
    applyDynamicPalette(buildPaletteFromHex(themeItem.accentColor));

    // Set ideal glassmorphism settings
    setBlockConfig("contentView", { opacity: 35, blur: 14, dim: 15 });
    setBlockConfig("sidebar", { opacity: 100, blur: 0, dim: 0 });
    setBlockConfig("miniplayer", { opacity: 60, blur: 20, dim: 15 });

    toast(`Tema "${themeItem.name}" aplicado`, "success");
  };

  const handleResetDefaultTheme = () => {
    setBackgroundImage(null);
    setDynamicAccent(false);
    setWallpaperAccentColor(null);
    applyDynamicPalette(null);
    resetAll();
    toast("Tema restablecido a SpoPlayer Original", "info");
  };

  const handleFileChange = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast(t("settings.customization.invalid_file_type") || "Please select an image or GIF file", "error");
        return;
      }
      if (file.size > 30 * 1024 * 1024) {
        toast(t("settings.customization.file_too_large") || "File size must be under 30 MB", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result) {
          setBackgroundImage(result);
          if (!isDark) {
            toast(
              t("settings.customization.dark_theme_only") ||
                "Customization is only available for dark theme",
              "info",
            );
          } else {
            toast(t("settings.customization.applied") || "Wallpaper applied", "success");
          }
        }
      };
      reader.onerror = () => {
        toast(t("settings.customization.read_error") || "Failed to read image file", "error");
      };
      reader.readAsDataURL(file);
    },
    [setBackgroundImage, toast, t, isDark],
  );

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const currentBlockConfig =
    activeBlock === "sidebar"
      ? sidebar
      : activeBlock === "contentView"
        ? contentView
        : miniplayer;

  return (
    <div className="flex flex-col gap-[16px]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* ── Curated Wallpaper Themes Section ── */}
      <SettingSection label="Temáticas y Fondos Exclusivos">
        <SettingBlock
          title="Temáticas SpoPlayer"
          description="Selecciona uno de los fondos exclusivos para adaptar automáticamente el logo, el acento de color y toda la interfaz de la app."
          searchQuery={searchQuery}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] pt-[4px]">
            {WALLPAPER_THEMES.map((item) => {
              const active =
                backgroundImage === item.image ||
                (wallpaperAccentColor === item.accentColor && Boolean(backgroundImage));

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTheme(item)}
                  className={`group relative flex flex-col justify-between h-[120px] p-[12px] rounded-2xl border text-left overflow-hidden transition-all duration-300 cursor-pointer ${
                    active
                      ? "border-[var(--accent-primary,#00f59b)] shadow-[0_0_24px_rgba(0,0,0,0.6)] ring-2 ring-[var(--accent-primary,#00f59b)]/50 scale-[1.01]"
                      : "border-border-primary/60 hover:border-text-tertiary/70 hover:scale-[1.01] shadow-md"
                  }`}
                >
                  {/* Background thumbnail with dark gradient overlay */}
                  <div className="absolute inset-0 z-0 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/35 backdrop-blur-[0.5px]" />
                  </div>

                  {/* Top: Logo variation + Active Badge */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <div className="flex items-center gap-[10px]">
                      <ThemeLogoSvg
                        accentColor={item.accentColor}
                        gradient={item.gradient}
                        size={36}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-bold text-white tracking-tight drop-shadow-sm truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-white/75 font-medium truncate max-w-[155px]">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    {active ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10.5px] font-bold text-black flex items-center gap-1 shadow-md shrink-0"
                        style={{ backgroundColor: item.accentColor }}
                      >
                        <CheckLine size={12} />
                        Activo
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-full bg-black/40 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <SparklesLine size={13} style={{ color: item.accentColor }} />
                      </span>
                    )}
                  </div>

                  {/* Bottom: Color Palette Pill */}
                  <div className="relative z-10 flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-white/30"
                        style={{ backgroundColor: item.accentColor }}
                      />
                      <span className="text-[11.5px] font-mono text-white/90 font-medium">
                        {item.accentColor}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/65 group-hover:text-white transition-colors">
                      {active ? "Tema aplicado" : "Click para aplicar"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {backgroundImage && (
            <div className="pt-[10px] flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetDefaultTheme}
                className="!text-[12px] !h-[28px] !px-[10px] text-text-secondary hover:text-text-primary"
              >
                <Refresh size={14} className="mr-1.5" />
                Restablecer a tema por defecto (Verde Esmeralda)
              </Button>
            </div>
          )}
        </SettingBlock>
      </SettingSection>

      {/* ── Background Wallpaper Section ── */}
      <SettingSection label="Fondo Personalizado">
        <SettingBlock
          title={t("settings.customization.wallpaper_title") || "Window Wallpaper"}
          description={
            t("settings.customization.wallpaper_description") ||
            "Set a custom image or animated GIF as the full window background."
          }
          titleKey="settings.customization.wallpaper_title"
          descKey="settings.customization.wallpaper_description"
          searchQuery={searchQuery}
        >
          {backgroundImage ? (
            <div className="flex flex-col gap-[12px] rounded-xl border border-border-primary/60 bg-border-alpha-14 p-[12px]">
              <div className="relative h-[120px] w-full overflow-hidden rounded-lg bg-black/40">
                <img
                  src={backgroundImage}
                  alt="Window Background"
                  className="h-full w-full object-cover"
                  style={{
                    filter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined,
                  }}
                />
                {backgroundDim > 0 && (
                  <div
                    className="absolute inset-0 bg-black pointer-events-none"
                    style={{ opacity: backgroundDim / 100 }}
                  />
                )}
                <div className="absolute right-[8px] top-[8px] flex items-center gap-[6px]">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="!h-[28px] !px-[10px] !gap-[5px] !text-[12px] bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border-0"
                  >
                    <Upload2Line size={14} />
                    {t("settings.customization.change_button") || "Change"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setBackgroundImage(null);
                      toast(t("settings.customization.removed") || "Wallpaper removed", "info");
                    }}
                    className="!h-[28px] !w-[28px] !p-0 bg-black/60 hover:bg-[#ff4d4d]/80 text-white backdrop-blur-md border-0"
                    title={t("settings.customization.remove_button") || "Remove"}
                    aria-label={t("settings.customization.remove_button") || "Remove"}
                  >
                    <TrashBin2 size={15} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[16px] pt-[4px]">
                <div className="flex flex-col gap-[4px]">
                  <span className="text-text-secondary text-[12px]" style={font}>
                    {t("settings.customization.wallpaper_blur") || "Wallpaper blur"}
                  </span>
                  <Slider
                    value={backgroundBlur}
                    onChange={setBackgroundBlur}
                    min={0}
                    max={30}
                    unit="px"
                    ariaLabel={t("settings.customization.wallpaper_blur") || "Wallpaper blur"}
                  />
                </div>
                <div className="flex flex-col gap-[4px]">
                  <span className="text-text-secondary text-[12px]" style={font}>
                    {t("settings.customization.wallpaper_dim") || "Wallpaper dimming"}
                  </span>
                  <Slider
                    value={backgroundDim}
                    onChange={setBackgroundDim}
                    min={0}
                    max={80}
                    unit="%"
                    ariaLabel={t("settings.customization.wallpaper_dim") || "Wallpaper dimming"}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-[8px] rounded-xl border border-dashed py-[24px] px-[16px] text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-text-primary bg-border-alpha-20"
                  : "border-border-secondary hover:border-text-tertiary hover:bg-border-alpha-14"
              }`}
            >
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-border-alpha-14 text-text-tertiary">
                <Gallery size={20} />
              </div>
              <div className="flex flex-col gap-[2px]">
                <span className="text-text-primary text-[13px] font-[500]" style={font}>
                  {t("settings.customization.upload_title") || "Select image or animated GIF"}
                </span>
                <span className="text-text-tertiary text-[11.5px]" style={font}>
                  {t("settings.customization.upload_hint") || "PNG, JPEG, GIF, WebP (up to 30MB)"}
                </span>
              </div>
            </div>
          )}

          <div className="pt-[14px]">
            <SettingRow
              title={t("settings.customization.dynamic_accent_title") || "Color dinámico según el fondo"}
              description={
                t("settings.customization.dynamic_accent_desc") ||
                "Adapta los botones, barras y acentos al color dominante de tu fondo de pantalla."
              }
              titleKey="settings.customization.dynamic_accent_title"
              descKey="settings.customization.dynamic_accent_desc"
              searchQuery={searchQuery}
              control={
                <ToggleSwitch
                  checked={dynamicAccent}
                  onChange={setDynamicAccent}
                  disabled={!backgroundImage}
                  ariaLabel={t("settings.customization.dynamic_accent_title") || "Color dinámico según el fondo"}
                />
              }
            />
          </div>
        </SettingBlock>
      </SettingSection>

      {/* ── 3 Logic Blocks Customization Section ── */}
      <SettingSection>
        <SettingBlock
          title={t("settings.customization.blocks_title") || "Blocks Glassmorphism"}
          description={
            t("settings.customization.blocks_description") ||
            "Adjust transparency, backdrop blur and dimming for each interface area."
          }
          titleKey="settings.customization.blocks_title"
          descKey="settings.customization.blocks_description"
          searchQuery={searchQuery}
        >
          <div className="flex flex-col gap-[14px]">
            {/* Block Target Selector */}
            <div className="flex items-center justify-between">
              <SegmentedControl<BlockTarget>
                ariaLabel={t("settings.customization.blocks_title") || "Blocks Glassmorphism"}
                value={activeBlock}
                onChange={setActiveBlock}
                options={[
                  {
                    value: "sidebar",
                    label: t("settings.customization.block_sidebar") || "Barra lateral",
                  },
                  {
                    value: "contentView",
                    label: t("settings.customization.block_content") || "Área principal",
                  },
                  {
                    value: "miniplayer",
                    label: t("settings.customization.block_miniplayer") || "Reproductor",
                  },
                ]}
              />

              <div className="flex items-center gap-[6px] shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    applyToAllBlocks(activeBlock);
                    toast(t("settings.customization.applied_to_all") || "Settings applied to all blocks", "success");
                  }}
                  className="!h-[32px] !px-[10px] !gap-[5px] !text-[12px] whitespace-nowrap"
                  title={t("settings.customization.apply_all_title") || "Apply settings to all blocks"}
                >
                  <CopyLine size={14} />
                  {t("settings.customization.apply_all") || "To all"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    resetBlock(activeBlock);
                    toast(t("settings.customization.block_reset") || "Block reset", "info");
                  }}
                  className="!h-[32px] !px-[10px] !gap-[5px] !text-[12px] whitespace-nowrap"
                  title={t("settings.customization.block_reset") || "Reset block"}
                >
                  <Refresh size={14} />
                  {t("settings.customization.reset_block") || "Reset"}
                </Button>
              </div>
            </div>

            {/* Block Sliders */}
            <div className="flex flex-col gap-[12px] rounded-xl border border-border-primary/60 bg-border-alpha-14 p-[14px]">
              {/* Opacity Slider */}
              <div className="flex items-center justify-between gap-[16px]">
                <div className="flex flex-col gap-[2px] min-w-0 max-w-[200px]">
                  <span className="text-text-primary text-[13px] font-[500]" style={font}>
                    {t("settings.customization.opacity") || "Opacity"}
                  </span>
                  <span className="text-text-tertiary text-[11.5px]" style={font}>
                    {t("settings.customization.opacity_desc") || "Background opacity level (min. 25%)"}
                  </span>
                </div>
                <div className="w-[190px] shrink-0">
                  <Slider
                    value={currentBlockConfig.opacity}
                    onChange={(val) => setBlockConfig(activeBlock, { opacity: val })}
                    min={MIN_OPACITY}
                    max={MAX_OPACITY}
                    unit="%"
                    ariaLabel={t("settings.customization.opacity") || "Opacity"}
                  />
                </div>
              </div>

              {/* Backdrop Blur Slider */}
              <div className="flex items-center justify-between gap-[16px]">
                <div className="flex flex-col gap-[2px] min-w-0 max-w-[200px]">
                  <span className="text-text-primary text-[13px] font-[500]" style={font}>
                    {t("settings.customization.blur") || "Backdrop blur"}
                  </span>
                  <span className="text-text-tertiary text-[11.5px]" style={font}>
                    {t("settings.customization.blur_desc") || "Frosted glass blur intensity"}
                  </span>
                </div>
                <div className="w-[190px] shrink-0">
                  <Slider
                    value={currentBlockConfig.blur}
                    onChange={(val) => setBlockConfig(activeBlock, { blur: val })}
                    min={MIN_BLUR}
                    max={MAX_BLUR}
                    unit="px"
                    ariaLabel={t("settings.customization.blur") || "Backdrop blur"}
                  />
                </div>
              </div>

              {/* Dimming Slider */}
              <div className="flex items-center justify-between gap-[16px]">
                <div className="flex flex-col gap-[2px] min-w-0 max-w-[200px]">
                  <span className="text-text-primary text-[13px] font-[500]" style={font}>
                    {t("settings.customization.dim") || "Dimming"}
                  </span>
                  <span className="text-text-tertiary text-[11.5px]" style={font}>
                    {t("settings.customization.dim_desc") || "Dark overlay for enhanced readability"}
                  </span>
                </div>
                <div className="w-[190px] shrink-0">
                  <Slider
                    value={currentBlockConfig.dim}
                    onChange={(val) => setBlockConfig(activeBlock, { dim: val })}
                    min={MIN_DIM}
                    max={MAX_DIM}
                    unit="%"
                    ariaLabel={t("settings.customization.dim") || "Dimming"}
                  />
                </div>
              </div>
            </div>
          </div>
        </SettingBlock>

        <SettingRow
          title={t("settings.customization.reset_all") || "Reset All Customization"}
          description={
            t("settings.customization.reset_all_desc") ||
            "Restore default appearance, clear background image and block glass effects."
          }
          titleKey="settings.customization.reset_all"
          descKey="settings.customization.reset_all_desc"
          searchQuery={searchQuery}
          control={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                resetAll();
                toast(t("settings.customization.all_reset") || "Customization reset", "info");
              }}
            >
              {t("settings.reset_defaults") || "Reset"}
            </Button>
          }
        />
      </SettingSection>
    </div>
  );
}
