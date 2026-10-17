import { Outlet } from 'react-router-dom';
import { AdminNav } from '@/features/admin/components/admin-nav';

export function AdminLayout() {
  return (
    <div className="flex min-h-svh">
      <AdminNav />
      <main className="min-w-0 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
