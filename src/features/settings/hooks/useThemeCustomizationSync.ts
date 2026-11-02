import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  useCustomizationStore,
  selectIsGlassThemeActive,
} from "../store/customizationStore";
import {
  extractPaletteFromImage,
  applyDynamicPalette,
} from "../lib/extractPalette";

// keeps light theme disabled and forces dark mode when wallpaper glass is active,
// and extracts dominant palette from wallpaper to adapt accent colors when dynamicAccent is enabled.
export function useThemeCustomizationSync() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isGlassActive = useCustomizationStore(selectIsGlassThemeActive);
  const backgroundImage = useCustomizationStore((s) => s.backgroundImage);
  const dynamicAccent = useCustomizationStore((s) => s.dynamicAccent);
  const setWallpaperAccentColor = useCustomizationStore((s) => s.setWallpaperAccentColor);

  useEffect(() => {
    // light theme on transparent blurred wallpaper has contrast issues, force dark
    if (isGlassActive && (theme === "light" || resolvedTheme === "light")) {
      setTheme("dark");
    }
  }, [isGlassActive, theme, resolvedTheme, setTheme]);

  useEffect(() => {
    let cancelled = false;

    if (dynamicAccent && backgroundImage) {
      void extractPaletteFromImage(backgroundImage).then((palette) => {
        if (!cancelled) {
          applyDynamicPalette(palette);
          setWallpaperAccentColor(palette?.primary ?? null);
        }
      });
    } else {
      applyDynamicPalette(null);
      setWallpaperAccentColor(null);
    }

    return () => {
      cancelled = true;
    };
  }, [dynamicAccent, backgroundImage, setWallpaperAccentColor]);

  return { isGlassActive };
}
