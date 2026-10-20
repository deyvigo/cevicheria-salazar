interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none ${
        checked ? 'bg-lima-300' : 'bg-naranja-200'
      }`}
    >
      <span
        aria-hidden="true"
        className={`ml-1 h-5 w-5 rounded-full bg-surface shadow-md transition-transform duration-200 ease-in-out motion-reduce:transition-none ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
