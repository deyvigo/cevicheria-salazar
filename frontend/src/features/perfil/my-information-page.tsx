import { useState } from 'react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Notification } from '@/components/notification';
import { useAuth } from '@/context/auth-context';
import { ChangePasswordDialog } from '@/features/perfil/components/change-password-dialog';
import { EditProfileDialog } from '@/features/perfil/components/edit-profile-dialog';

type OpenDialog = 'profile' | 'password' | null;

export function MyInformationPage() {
  const { user } = useAuth();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!user) return null;

  function saved(message: string) {
    setOpenDialog(null);
    setNotice(message);
  }

  const details = [
    ['Nombres', user.firstName],
    ['Apellidos', user.lastName],
    ['Teléfono', user.phone || 'No registrado'],
    ['Correo', user.email],
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-ink text-[32px] leading-[40px] font-semibold">Mi información</h1>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-ink text-[22px] leading-7 font-semibold">Datos personales</h2>
        <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-base">
          {details.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-bold text-ink-muted">{label}</dt>
              <dd className="min-w-0 break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <div>
          <Button onClick={() => setOpenDialog('profile')}>Editar datos</Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-ink text-[22px] leading-7 font-semibold">Contraseña</h2>
        <p className="text-base text-ink-muted">
          {user.hasPassword
            ? 'Cambia tu contraseña cuando quieras. Cerraremos tus sesiones en otros dispositivos.'
            : 'Tu cuenta entra con Google. Crea una contraseña para poder entrar también con tu correo.'}
        </p>
        <div>
          <Button onClick={() => setOpenDialog('password')}>
            {user.hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
          </Button>
        </div>
      </Card>

      <EditProfileDialog
        open={openDialog === 'profile'}
        user={user}
        onClose={() => setOpenDialog(null)}
        onSaved={() => saved('Tus datos fueron actualizados')}
      />
      <ChangePasswordDialog
        open={openDialog === 'password'}
        hasPassword={user.hasPassword}
        onClose={() => setOpenDialog(null)}
        onSaved={() => saved('Tu contraseña fue actualizada')}
      />

      {notice ? (
        <div className="fixed right-6 bottom-6 z-50">
          <Notification variant="success" title={notice} onClose={() => setNotice(null)} />
        </div>
      ) : null}
    </div>
  );
}
