import { type ReactNode } from "react";
import { create } from "zustand";

export type WindowAnimationPhase = "idle" | "closing";

interface WindowAnimationStore {
  phase: WindowAnimationPhase;
  triggerMinimize: () => void;
  triggerClose: () => void;
}

export const useWindowAnimationStore = create<WindowAnimationStore>((set, get) => ({
  phase: "idle",
  triggerMinimize: () => {
    // Native instant minimize: zero DOM opacity/scale manipulation.
    // Preserves the DWM taskbar preview thumbnail perfectly and restores with zero grey flash or lag.
    void window.spoplayerElectron?.minimize?.();
  },
  triggerClose: () => {
    if (get().phase !== "idle") return;

    if (process.env.NODE_ENV === "test") {
      void window.spoplayerElectron?.close?.();
      return;
    }

    set({ phase: "closing" });
    setTimeout(() => {
      void window.spoplayerElectron?.close?.();
      // Reset back to idle so when restored from tray/taskbar it is fully visible
      setTimeout(() => {
        set({ phase: "idle" });
      }, 50);
    }, 120);
  },
}));

export function WindowAnimationContainer({ children }: { children: ReactNode }) {
  const phase = useWindowAnimationStore((s) => s.phase);

  let transform = "none";
  let opacity = 1;
  let transition = "none";
  let transformOrigin = "50% 50%";

  if (phase === "closing") {
    transform = "scale(0.94) translateY(8px)";
    opacity = 0;
    transition =
      "transform 120ms cubic-bezier(0.16, 1, 0.3, 1), opacity 110ms cubic-bezier(0.16, 1, 0.3, 1)";
    transformOrigin = "50% 50%";
  }

  return (
    <div
      className="h-full w-full transform-gpu"
      style={{
        transform,
        opacity,
        transition,
        transformOrigin,
      }}
    >
      {children}
    </div>
  );
}

export default WindowAnimationContainer;
