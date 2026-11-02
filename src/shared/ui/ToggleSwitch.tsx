export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`group relative inline-flex h-[24px] w-[42px] shrink-0 items-center rounded-full transition-all duration-200 select-none border border-transparent ${
        disabled
          ? "cursor-not-allowed opacity-40 " + (checked ? "bg-text-tertiary" : "bg-white/[0.04]")
          : "cursor-pointer " + (checked ? "bg-[var(--accent-primary,#00f59b)] shadow-[0_0_12px_rgba(0,245,155,0.25)] border-[var(--accent-primary,#00f59b)]/40" : "bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.08]")
      }`}
      aria-pressed={checked}
      aria-label={ariaLabel}
    >
      <span
        className={`inline-block h-[18px] w-[18px] rounded-full transition-all duration-200 ease-out shadow-sm ${
          checked
            ? "translate-x-[20px] " + (disabled ? "bg-bg-tertiary" : "bg-[#060a08]")
            : "translate-x-[3px] " + (disabled ? "bg-white/60" : "bg-white/90")
        }`}
      />
    </button>
  );
}

export default ToggleSwitch;
