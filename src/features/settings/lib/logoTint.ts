import { useState, useEffect } from "react";
import defaultLogo from "@/assets/spoplayer-logo.png";
import { useCustomizationStore } from "../store/customizationStore";

export const DEFAULT_APP_GREEN = "#00f59b";

export function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c
      .split("")
      .map((x) => x + x)
      .join("");
  }
  if (c.length < 6) {
    return [0, 245, 155]; // fallback emerald green
  }
  const num = parseInt(c.slice(0, 6), 16);
  if (isNaN(num)) return [0, 245, 155];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const logoCache = new Map<string, string>();
let baseImgPromise: Promise<HTMLImageElement> | null = null;
let cachedBaseImg: HTMLImageElement | null = null;

function loadBaseLogoImage(): Promise<HTMLImageElement> {
  if (cachedBaseImg && cachedBaseImg.complete) {
    return Promise.resolve(cachedBaseImg);
  }
  if (baseImgPromise) {
    return baseImgPromise;
  }

  baseImgPromise = new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      reject(new Error("Image is not available"));
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cachedBaseImg = img;
      resolve(img);
    };
    img.onerror = () => {
      baseImgPromise = null;
      reject(new Error("Failed to load base logo"));
    };
    img.src = defaultLogo;
  });

  return baseImgPromise;
}

/**
 * Tints spoplayer-logo.png to the target hex color.
 * The original image has an emerald green background rgb(0, 221, 147) and dark equalizer bars rgb(7, 19, 14).
 * We smoothly tint the background and all anti-aliased edges while preserving the dark equalizer bars.
 */
export async function getTintedLogo(
  hexColor: string,
  size: number = 128,
): Promise<string> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return defaultLogo;
  }

  const normalizedHex = hexColor.toLowerCase().trim();
  const cacheKey = `${normalizedHex}_${size}`;

  if (logoCache.has(cacheKey)) {
    return logoCache.get(cacheKey)!;
  }

  try {
    const img = await loadBaseLogoImage();
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return defaultLogo;

    ctx.drawImage(img, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    const [targetR, targetG, targetB] = hexToRgb(normalizedHex);
    const darkR = 7;
    const darkG = 19;
    const darkB = 14;

    for (let i = 0; i < data.length; i += 4) {
      const g = data[i + 1];
      // Normalize t based on original green (g ~ 221) vs dark bars (g ~ 19)
      const t = Math.max(0, Math.min(1, (g - darkG) / (221 - darkG)));

      data[i] = Math.round((1 - t) * darkR + t * targetR);
      data[i + 1] = Math.round((1 - t) * darkG + t * targetG);
      data[i + 2] = Math.round((1 - t) * darkB + t * targetB);
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    logoCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn("Unable to generate tinted logo, using default:", err);
    return defaultLogo;
  }
}

export interface DynamicLogoInfo {
  logoSrc: string;
  accentColor: string;
  hasCustomWallpaper: boolean;
}

/**
 * Hook to access the current dynamic logo and accent color based on active wallpaper.
 * - When a wallpaper is active, provides the dynamically tinted logo and extracted accent.
 * - When no wallpaper is set ("sin fondo"), returns the default green logo and #00f59b.
 */
export function useDynamicLogo(): DynamicLogoInfo {
  const backgroundImage = useCustomizationStore((s) => s.backgroundImage);
  const dynamicAccent = useCustomizationStore((s) => s.dynamicAccent);
  const wallpaperAccentColor = useCustomizationStore((s) => s.wallpaperAccentColor);

  const hasCustomWallpaper = Boolean(
    backgroundImage && dynamicAccent && wallpaperAccentColor,
  );
  const activeColor = hasCustomWallpaper && wallpaperAccentColor
    ? wallpaperAccentColor
    : DEFAULT_APP_GREEN;

  const [tintedLogoSrc, setTintedLogoSrc] = useState<string>(() => {
    if (hasCustomWallpaper && activeColor) {
      const cacheKey = `${activeColor.toLowerCase().trim()}_128`;
      return logoCache.get(cacheKey) || defaultLogo;
    }
    return defaultLogo;
  });

  useEffect(() => {
    if (!hasCustomWallpaper) {
      setTintedLogoSrc(defaultLogo);
      return;
    }

    let active = true;
    void getTintedLogo(activeColor, 128).then((url) => {
      if (active) {
        setTintedLogoSrc(url);
      }
    });

    return () => {
      active = false;
    };
  }, [hasCustomWallpaper, activeColor]);

  return {
    logoSrc: hasCustomWallpaper ? tintedLogoSrc : defaultLogo,
    accentColor: activeColor,
    hasCustomWallpaper,
  };
}
