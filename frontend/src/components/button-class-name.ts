export type ButtonVariant = 'primary' | 'secondary' | 'outline';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-action text-on-action hover:bg-action-hover active:bg-action-pressed',
  secondary: 'bg-action-secondary text-ink hover:bg-action-secondary-hover',
  outline: 'border border-ink bg-transparent text-ink shadow-none hover:border-ink/60',
};

// Shared with links that must look like a button, so they never nest a <button> inside an <a>
export function buttonClassName(variant: ButtonVariant = 'primary'): string {
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-6 text-button shadow-xs focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-ink-disabled disabled:shadow-none ${VARIANT_CLASSES[variant]}`;
}
