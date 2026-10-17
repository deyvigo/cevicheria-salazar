import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Notification } from '@/components/notification';
import { ADMIN_SECTIONS } from '@/features/admin/admin-sections';
import { useAdminSession } from '@/features/admin/admin-session';

const ITEM_CLASSES =
  'flex min-h-12 w-full items-center gap-3 rounded-md text-left text-base focus-visible:shadow-focus focus-visible:outline-none';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const SECTION_ICONS: Record<(typeof ADMIN_SECTIONS)[number]['path'], ReactNode> = {
  platos: (
    <>
      <path d="M4 15h16a8 8 0 0 0-16 0Z" />
      <path d="M3 19h18" />
    </>
  ),
  categorias: (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  pedidos: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h6" />
    </>
  ),
  reportes: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
};

export function AdminNav() {
  const { signOut } = useAdminSession();
  const [collapsed, setCollapsed] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  async function handleSignOut() {
    setSignOutError(false);
    try {
      await signOut();
    } catch {
      setSignOutError(true);
    }
  }

  const itemLayout = collapsed ? 'justify-center' : 'px-4';
  const labelClasses = collapsed ? 'sr-only' : '';

  return (
    <>
      <aside
        className={`sticky top-0 flex h-svh flex-none flex-col border-r border-border bg-surface p-2 transition-[width] ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`flex min-h-12 items-center ${collapsed ? 'justify-center' : 'justify-between pl-4'}`}>
          {collapsed ? null : (
            <span className="font-display text-ink text-[24px] leading-[30px] font-semibold">Administrador</span>
          )}
          <button
            type="button"
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-md text-ink hover:bg-surface-celeste focus-visible:shadow-focus focus-visible:outline-none"
          >
            <Icon>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </Icon>
          </button>
        </div>

        <nav aria-label="Panel de administración" className="mt-2">
          <ul className="flex flex-col gap-1">
            {ADMIN_SECTIONS.map((section) => (
              <li key={section.path}>
                <NavLink
                  to={`/admin/${section.path}`}
                  title={collapsed ? section.label : undefined}
                  className={({ isActive }) =>
                    `${ITEM_CLASSES} ${itemLayout} ${isActive ? 'bg-action-secondary font-bold text-ink' : 'text-ink hover:bg-surface-celeste'}`
                  }
                >
                  <Icon>{SECTION_ICONS[section.path]}</Icon>
                  <span className={labelClasses}>{section.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={`${ITEM_CLASSES} ${itemLayout} mt-auto text-ink hover:bg-surface-celeste`}
        >
          <Icon>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </Icon>
          <span className={labelClasses}>Cerrar sesión</span>
        </button>
      </aside>
      {signOutError ? (
        <div className="fixed right-6 bottom-6">
          <Notification
            variant="error"
            title="No pudimos cerrar tu sesión"
            message="Intenta de nuevo."
            onClose={() => setSignOutError(false)}
          />
        </div>
      ) : null}
    </>
  );
}
