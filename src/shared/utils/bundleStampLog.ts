import { log } from "./logger";

export function initBundleStampLog(): () => void {
  if (typeof window === "undefined") return () => {};
  return window.spoplayerElectron?.onBundleStamp?.((line) => log("gray", "bundle", line)) ?? (() => {});
}
