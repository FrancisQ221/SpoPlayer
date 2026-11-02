export interface ExtractedPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  warning: string;
  btnBg: string;
  btnText: string;
  toolboxActive: string;
  borderAlpha14: string;
  borderAlpha33: string;
  rawRgb: [number, number, number];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tNorm = t;
      if (tNorm < 0) tNorm += 1;
      if (tNorm > 1) tNorm -= 1;
      if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
      if (tNorm < 1 / 2) return q;
      if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function extractPaletteFromImage(src: string): Promise<ExtractedPalette | null> {
  return new Promise((resolve) => {
    if (!src || typeof document === "undefined" || typeof Image === "undefined") {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        // Divide into 12 hue bins (30 degrees each)
        const bins: {
          weight: number;
          r: number;
          g: number;
          b: number;
          count: number;
        }[] = Array.from({ length: 12 }, () => ({
          weight: 0,
          r: 0,
          g: 0,
          b: 0,
          count: 0,
        }));

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let validPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          totalR += r;
          totalG += g;
          totalB += b;
          validPixels++;

          const [h, s, l] = rgbToHsl(r, g, b);

          // Skip extreme darks, lights or low saturation for vibrancy detection
          if (l < 0.12 || l > 0.90 || s < 0.18) {
            continue;
          }

          // Quadratic vibrancy weighting
          const vibrancy = s * (1 - Math.abs(l - 0.55) * 1.4);
          const weight = Math.max(0.01, vibrancy * vibrancy);

          const binIndex = Math.min(11, Math.floor(h * 12));
          bins[binIndex].weight += weight;
          bins[binIndex].r += r * weight;
          bins[binIndex].g += g * weight;
          bins[binIndex].b += b * weight;
          bins[binIndex].count++;
        }

        let bestBin = bins[0];
        let maxWeight = 0;
        for (const bin of bins) {
          if (bin.weight > maxWeight) {
            maxWeight = bin.weight;
            bestBin = bin;
          }
        }

        let chosenR: number, chosenG: number, chosenB: number;

        if (maxWeight > 0.5 && bestBin.weight > 0) {
          chosenR = Math.round(bestBin.r / bestBin.weight);
          chosenG = Math.round(bestBin.g / bestBin.weight);
          chosenB = Math.round(bestBin.b / bestBin.weight);
        } else if (validPixels > 0) {
          chosenR = Math.round(totalR / validPixels);
          chosenG = Math.round(totalG / validPixels);
          chosenB = Math.round(totalB / validPixels);
        } else {
          // SpoPlayer default vibrant emerald fallback
          chosenR = 0;
          chosenG = 245;
          chosenB = 155;
        }

        let [h, s, l] = rgbToHsl(chosenR, chosenG, chosenB);

        // If achromatic, preserve default SpoPlayer emerald
        if (s < 0.15) {
          h = 158 / 360;
          s = 1.0;
          l = 0.48;
        } else {
          // Boost saturation for neon pop and tune lightness for dark backgrounds
          s = Math.max(0.75, Math.min(1.0, s * 1.2));
          l = Math.max(0.52, Math.min(0.66, l));
        }

        const [primR, primG, primB] = hslToRgb(h, s, l);
        const primary = rgbToHex(primR, primG, primB);

        const secL = Math.min(0.86, l + 0.14);
        const [secR, secG, secB] = hslToRgb(h, s, secL);
        const secondary = rgbToHex(secR, secG, secB);

        const terL = Math.min(0.93, l + 0.28);
        const [terR, terG, terB] = hslToRgb(h, Math.max(0.45, s * 0.8), terL);
        const tertiary = rgbToHex(terR, terG, terB);

        const btnText = l > 0.45 ? "#05120a" : "#ffffff";

        resolve({
          primary,
          secondary,
          tertiary,
          warning: "#ffb84d",
          btnBg: primary,
          btnText,
          toolboxActive: `rgba(${primR}, ${primG}, ${primB}, 0.15)`,
          borderAlpha14: `rgba(${primR}, ${primG}, ${primB}, 0.14)`,
          borderAlpha33: `rgba(${primR}, ${primG}, ${primB}, 0.30)`,
          rawRgb: [primR, primG, primB],
        });
      } catch (err) {
        console.error("Error extracting wallpaper palette:", err);
        resolve(null);
      }
    };

    img.onerror = () => {
      resolve(null);
    };

    img.src = src;
  });
}

export function applyDynamicPalette(palette: ExtractedPalette | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (!palette) {
    root.style.removeProperty("--accent-primary");
    root.style.removeProperty("--accent-secondary");
    root.style.removeProperty("--accent-tertiary");
    root.style.removeProperty("--btn-primary-bg");
    root.style.removeProperty("--btn-primary-text");
    root.style.removeProperty("--bg-toolbox-active");
    root.style.removeProperty("--border-white-alpha-14");
    root.style.removeProperty("--border-white-alpha-33");

    root.style.removeProperty("--color-accent-primary");
    root.style.removeProperty("--color-accent-secondary");
    root.style.removeProperty("--color-accent-tertiary");
    root.style.removeProperty("--color-btn-primary-bg");
    root.style.removeProperty("--color-btn-primary-text");
    root.style.removeProperty("--color-bg-toolbox-active");
    root.style.removeProperty("--color-border-alpha-14");
    root.style.removeProperty("--color-border-alpha-33");
    return;
  }

  root.style.setProperty("--accent-primary", palette.primary);
  root.style.setProperty("--accent-secondary", palette.secondary);
  root.style.setProperty("--accent-tertiary", palette.tertiary);
  root.style.setProperty("--btn-primary-bg", palette.btnBg);
  root.style.setProperty("--btn-primary-text", palette.btnText);
  root.style.setProperty("--bg-toolbox-active", palette.toolboxActive);
  root.style.setProperty("--border-white-alpha-14", palette.borderAlpha14);
  root.style.setProperty("--border-white-alpha-33", palette.borderAlpha33);

  root.style.setProperty("--color-accent-primary", palette.primary);
  root.style.setProperty("--color-accent-secondary", palette.secondary);
  root.style.setProperty("--color-accent-tertiary", palette.tertiary);
  root.style.setProperty("--color-btn-primary-bg", palette.btnBg);
  root.style.setProperty("--color-btn-primary-text", palette.btnText);
  root.style.setProperty("--color-bg-toolbox-active", palette.toolboxActive);
  root.style.setProperty("--color-border-alpha-14", palette.borderAlpha14);
  root.style.setProperty("--color-border-alpha-33", palette.borderAlpha33);
}
