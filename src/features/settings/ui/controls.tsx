import type { ReactNode } from "react";
import { getTranslationsForAllLocales } from "@/languages";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;

// single-line row: label on the left, control pinned right, like the reference mock
export function SettingRow({
  title,
  description,
  control,
  titleKey,
  descKey,
  searchQuery,
}: {
  title: string;
  description?: string;
  control?: ReactNode;
  titleKey?: string;
  descKey?: string;
  searchQuery?: string;
}) {
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    let isMatch =
      title.toLowerCase().includes(q) ||
      (description ? description.toLowerCase().includes(q) : false);

    if (!isMatch && (titleKey || descKey)) {
      const allTexts: string[] = [];
      if (titleKey) allTexts.push(...getTranslationsForAllLocales(titleKey));
      if (descKey) allTexts.push(...getTranslationsForAllLocales(descKey));
      isMatch = allTexts.some((text) => text.toLowerCase().includes(q));
    }

    if (!isMatch) return null;
  }

  return (
    <div className="flex items-center justify-between gap-[16px] py-[13px] px-[12px] rounded-xl hover:bg-white/[0.03] transition-colors">
      <div className="flex min-w-0 max-w-[380px] flex-col gap-[2px]">
        <span
          className="text-text-primary text-[13.5px] font-[500] leading-snug"
          style={font}
        >
          {title}
        </span>
        {description ? (
          <span
            className="text-text-tertiary text-[12px] leading-relaxed"
            style={font}
          >
            {description}
          </span>
        ) : null}
      </div>
      {control ? <div className="shrink-0">{control}</div> : null}
    </div>
  );
}

// stacked block: label on top, wide control (cards, grids) below
export function SettingBlock({
  title,
  description,
  children,
  titleKey,
  descKey,
  searchQuery,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  titleKey?: string;
  descKey?: string;
  searchQuery?: string;
}) {
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    let isMatch =
      title.toLowerCase().includes(q) ||
      (description ? description.toLowerCase().includes(q) : false);

    if (!isMatch && (titleKey || descKey)) {
      const allTexts: string[] = [];
      if (titleKey) allTexts.push(...getTranslationsForAllLocales(titleKey));
      if (descKey) allTexts.push(...getTranslationsForAllLocales(descKey));
      isMatch = allTexts.some((text) => text.toLowerCase().includes(q));
    }

    if (!isMatch) return null;
  }

  return (
    <div className="flex flex-col gap-[10px] py-[13px] px-[12px] rounded-xl hover:bg-white/[0.02] transition-colors">
      <div className="flex min-w-0 max-w-[460px] flex-col gap-[2px]">
        <span
          className="text-text-primary text-[13.5px] font-[500] leading-snug"
          style={font}
        >
          {title}
        </span>
        {description ? (
          <span
            className="text-text-tertiary text-[12px] leading-relaxed"
            style={font}
          >
            {description}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// faint uppercase group label, keeps long tabs scannable without extra prose
export function SettingSection({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-[2px]">
      {label ? (
        <div className="flex items-center gap-[8px] pt-[8px] pb-[4px] px-[8px]">
          <span
            className="text-[var(--accent-primary,#00f59b)] text-[10.5px] font-[700] uppercase tracking-[0.08em] m-0"
            style={font}
          >
            {label}
          </span>
          <div className="flex-1 h-[1px] bg-white/[0.06]" />
        </div>
      ) : null}
      <div className="flex flex-col divide-y divide-white/[0.05]">
        {children}
      </div>
    </section>
  );
}

// compact pill switcher reused by language / playback / mini-player rows
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      className={`inline-flex w-fit shrink-0 items-center gap-[2px] rounded-xl p-[3px] bg-white/[0.04] border border-white/[0.08] transition-opacity ${
        disabled
          ? "opacity-50 cursor-not-allowed pointer-events-none"
          : ""
      }`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            aria-pressed={isActive}
            className={`inline-flex h-[28px] items-center whitespace-nowrap rounded-lg border-0 px-[12px] text-[12px] leading-none transition-all ${
              disabled
                ? isActive
                  ? "bg-white/[0.06] text-text-tertiary cursor-not-allowed"
                  : "bg-transparent text-text-tertiary/70 cursor-not-allowed"
                : isActive
                  ? "bg-[var(--accent-primary,#00f59b)] text-black font-semibold shadow-[0_0_12px_rgba(0,245,155,0.25)] cursor-pointer"
                  : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.04] cursor-pointer"
            }`}
            style={{ ...font, fontWeight: isActive ? 600 : 400 }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
