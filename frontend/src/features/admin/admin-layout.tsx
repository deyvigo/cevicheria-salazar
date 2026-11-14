import { Outlet } from 'react-router-dom';
import { AdminOrdersLiveProvider } from '@/features/admin/admin-orders-live';
import { AdminNav } from '@/features/admin/components/admin-nav';

export function AdminLayout() {
  return (
    <AdminOrdersLiveProvider>
      <div className="flex min-h-svh">
        <AdminNav />
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </AdminOrdersLiveProvider>
  );
}
