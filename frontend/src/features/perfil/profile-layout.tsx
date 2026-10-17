import { Outlet } from 'react-router-dom';
import { ProfileNav } from '@/features/perfil/components/profile-nav';

export function ProfileLayout() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 items-start gap-6 px-6 py-6">
      <ProfileNav />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
