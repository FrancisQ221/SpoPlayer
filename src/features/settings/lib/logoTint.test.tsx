import React, { act } from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { hexToRgb, DEFAULT_APP_GREEN, useDynamicLogo } from "./logoTint";
import { useCustomizationStore } from "../store/customizationStore";

describe("logoTint", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let hookValue: ReturnType<typeof useDynamicLogo> | null = null;

  function TestComponent() {
    hookValue = useDynamicLogo();
    return null;
  }

  function mount() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<TestComponent />);
    });
  }

  beforeEach(() => {
    hookValue = null;
    useCustomizationStore.setState({
      backgroundImage: null,
      dynamicAccent: true,
      wallpaperAccentColor: null,
    });
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root!.unmount();
      });
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    }
    root = null;
    container = null;
    hookValue = null;
    document.body.innerHTML = "";
  });

  describe("hexToRgb", () => {
    it("converts 6-digit hex string correctly", () => {
      expect(hexToRgb("#00f59b")).toEqual([0, 245, 155]);
      expect(hexToRgb("#ff0000")).toEqual([255, 0, 0]);
      expect(hexToRgb("#a855f7")).toEqual([168, 85, 247]);
    });

    it("converts 3-digit shorthand hex string correctly", () => {
      expect(hexToRgb("#f00")).toEqual([255, 0, 0]);
      expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    });

    it("falls back to default emerald green on invalid input", () => {
      expect(hexToRgb("invalid")).toEqual([0, 245, 155]);
      expect(hexToRgb("")).toEqual([0, 245, 155]);
    });
  });

  describe("useDynamicLogo", () => {
    it("returns default green when there is no wallpaper (sin fondo)", () => {
      mount();
      expect(hookValue).not.toBeNull();
      expect(hookValue!.hasCustomWallpaper).toBe(false);
      expect(hookValue!.accentColor).toBe(DEFAULT_APP_GREEN);
      expect(hookValue!.logoSrc).toBeDefined();
    });

    it("returns wallpaper accent color when a wallpaper is active", () => {
      useCustomizationStore.setState({
        backgroundImage: "data:image/png;base64,mock",
        dynamicAccent: true,
        wallpaperAccentColor: "#c084fc",
      });

      mount();
      expect(hookValue!.hasCustomWallpaper).toBe(true);
      expect(hookValue!.accentColor).toBe("#c084fc");
    });

    it("reverts to default green when wallpaper is cleared (sin fondo)", () => {
      useCustomizationStore.setState({
        backgroundImage: "data:image/png;base64,mock",
        dynamicAccent: true,
        wallpaperAccentColor: "#c084fc",
      });

      mount();
      expect(hookValue!.hasCustomWallpaper).toBe(true);
      expect(hookValue!.accentColor).toBe("#c084fc");

      act(() => {
        useCustomizationStore.getState().setBackgroundImage(null);
      });

      expect(hookValue!.hasCustomWallpaper).toBe(false);
      expect(hookValue!.accentColor).toBe(DEFAULT_APP_GREEN);
    });

    it("reverts to default green when dynamic accent is disabled", () => {
      useCustomizationStore.setState({
        backgroundImage: "data:image/png;base64,mock",
        dynamicAccent: true,
        wallpaperAccentColor: "#c084fc",
      });

      mount();
      expect(hookValue!.hasCustomWallpaper).toBe(true);

      act(() => {
        useCustomizationStore.setState({ dynamicAccent: false });
      });

      expect(hookValue!.hasCustomWallpaper).toBe(false);
      expect(hookValue!.accentColor).toBe(DEFAULT_APP_GREEN);
    });
  });
});
