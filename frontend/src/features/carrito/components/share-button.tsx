import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Notification } from '@/components/notification';
import { buildShareUrl, type CartItem } from '@/features/carrito/share-code';

type Outcome = { kind: 'copied' } | { kind: 'manual'; url: string } | { kind: 'too-long' } | null;

const TOAST_DURATION_MS = 4000;

export function ShareButton({ items }: { items: CartItem[] }) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outcome?.kind !== 'copied' && outcome?.kind !== 'too-long') return;
    const timer = setTimeout(() => setOutcome(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [outcome]);

  useEffect(() => {
    if (outcome?.kind === 'manual') inputRef.current?.select();
  }, [outcome]);

  async function handleShare() {
    const url = buildShareUrl(items);
    if (url === null) {
      setOutcome({ kind: 'too-long' });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setOutcome({ kind: 'copied' });
    } catch {
      // No clipboard permission or insecure context: let the customer copy it by hand
      setOutcome({ kind: 'manual', url });
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <Button variant="secondary" onClick={handleShare}>
        Compartir
      </Button>
      {outcome?.kind === 'manual' ? (
        <Input ref={inputRef} id="share-link" label="Copia el enlace de tu carrito" readOnly value={outcome.url} />
      ) : null}
      {outcome?.kind === 'copied' || outcome?.kind === 'too-long' ? (
        <div className="fixed right-6 bottom-6">
          <Notification
            variant={outcome.kind === 'copied' ? 'success' : 'error'}
            title={
              outcome.kind === 'copied'
                ? 'Copiamos el enlace de tu carrito'
                : 'Tu carrito es muy grande para compartirlo'
            }
            onClose={() => setOutcome(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
