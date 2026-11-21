import { Outlet } from 'react-router-dom';
import { AdminOrdersLiveProvider } from '@/features/admin/admin-orders-live';
import { AdminNav } from '@/features/admin/components/admin-nav';

export function AdminLayout() {
  return (
    <AdminOrdersLiveProvider>
      <div className="flex h-svh overflow-hidden">
        <AdminNav />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </AdminOrdersLiveProvider>
  );
}
