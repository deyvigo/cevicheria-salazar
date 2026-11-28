import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Notification } from '@/components/notification';
import type { Address } from '@/features/perfil/address-api';
import { AddressCard } from '@/features/perfil/components/address-card';
import { AddressDialog } from '@/features/perfil/components/address-dialog';
import { DeleteAddressDialog } from '@/features/perfil/components/delete-address-dialog';
import { useInvalidateAddresses } from '@/features/perfil/use-address-mutations';
import { useAddresses } from '@/features/perfil/use-addresses';
import { NOTICE_POSITION } from '@/components/notice-position';

const MAX_ADDRESSES = 10;
const FADE_OUT_MS = 250;

export function MyAddressesPage() {
  const { data: addresses, isPending, isError, refetch } = useAddresses();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Address | undefined>();
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<number | null>(null);
  const invalidateAddresses = useInvalidateAddresses();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const full = (addresses?.length ?? 0) >= MAX_ADDRESSES;

  function openForm(address?: Address) {
    setEditing(address);
    setFormOpen(true);
  }

  function removed(address: Address) {
    setDeleting(null);
    setNotice('Dirección eliminada');
    // Wait for the fade so the card doesn't vanish abruptly; with reduced motion there is no fade to wait for
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      invalidateAddresses();
      return;
    }
    setLeavingId(address.id);
    timer.current = setTimeout(() => {
      invalidateAddresses();
      setLeavingId(null);
    }, FADE_OUT_MS);
  }

  function saved(message: string) {
    setFormOpen(false);
    setNotice(message);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-ink text-title-lg">Mis direcciones</h1>
        {addresses && addresses.length > 0 ? (
          <Button onClick={() => openForm()} disabled={full}>
            Agregar dirección
          </Button>
        ) : null}
      </div>

      {full ? (
        <p role="status" className="text-body text-ink-muted">
          Alcanzaste el máximo de {MAX_ADDRESSES} direcciones. Elimina una para agregar otra.
        </p>
      ) : null}

      {isPending ? <p className="text-body text-ink-muted">Cargando tus direcciones...</p> : null}

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-body font-bold text-error-text">No pudimos cargar tus direcciones.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {addresses && addresses.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-ink-muted">Aún no tienes direcciones guardadas</p>
          <Button onClick={() => openForm()}>Agregar dirección</Button>
        </div>
      ) : null}

      {addresses && addresses.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {addresses.map((address) => (
            <li key={address.id}>
              <AddressCard
                leaving={address.id === leavingId}
                address={address}
                onEdit={() => openForm(address)} onDelete={() => setDeleting(address)} />
            </li>
          ))}
        </ul>
      ) : null}

      <AddressDialog open={formOpen} address={editing} onClose={() => setFormOpen(false)} onSaved={saved} />
      <DeleteAddressDialog
        address={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={removed}
      />

      {notice ? (
        <div className={NOTICE_POSITION}>
          <Notification variant="success" title={notice} onClose={() => setNotice(null)} />
        </div>
      ) : null}
    </div>
  );
}
