import { Outlet } from 'react-router-dom';
import { ProfileNav } from '@/features/perfil/components/profile-nav';

export function ProfileLayout() {
  return (
    <div className="flex flex-1">
      <ProfileNav />
      <main className="min-w-0 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
