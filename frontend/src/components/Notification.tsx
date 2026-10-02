export interface NotificationProps {
  /** Solo `success` por ahora (HU-01); se agregan info/warning/error/promo cuando una historia los necesite. */
  variant: 'success';
  title: string;
  message?: string;
  onClose?: () => void;
}

const VARIANT_CLASSES: Record<NotificationProps['variant'], string> = {
  success: 'bg-success-surface border-lima-300',
};

const VARIANT_ICON: Record<NotificationProps['variant'], string> = {
  success: '/icons/notif-success.svg',
};

/** Toast del design-system/components/Notification/README.md: ícono + título + texto, nunca solo color. */
export function Notification({ variant, title, message, onClose }: NotificationProps) {
  return (
    <div
      role="status"
      className={`flex w-full max-w-[380px] items-start gap-3 rounded-lg border p-4 shadow-md ${VARIANT_CLASSES[variant]}`}
    >
      <img src={VARIANT_ICON[variant]} alt="" className="h-10 w-10 flex-none" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        {message ? <p className="mt-0.5 text-sm text-ink-muted">{message}</p> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-sm text-ink-muted hover:bg-surface-celeste"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
