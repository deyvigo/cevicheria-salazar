import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Notification } from '@/components/notification';
import { useLogout } from '@/features/auth/use-auth-mutations';
import { PERSON_ICON_PATHS } from '@/features/perfil/components/person-icon';
import { PROFILE_SECTIONS } from '@/features/perfil/profile-sections';

const SECTION_ICONS: Record<(typeof PROFILE_SECTIONS)[number]['path'], ReactNode> = {
  'mi-informacion': PERSON_ICON_PATHS,
};

const ITEM_CLASSES =
  'flex min-h-12 w-full items-center gap-3 rounded-md px-4 text-left text-base focus-visible:shadow-focus focus-visible:outline-none';

export function ProfileNav() {
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState(false);

  async function handleLogout() {
    setLogoutError(false);
    try {
      await logoutMutation.mutateAsync();
    } catch {
      setLogoutError(true);
      return;
    }
    navigate('/', { state: { loggedOut: true } });
  }

  return (
    <>
    <aside className="flex w-64 flex-none flex-col self-stretch border-r border-border bg-surface p-2">
      <nav aria-label="Perfil">
        <ul className="flex flex-col gap-1">
          {PROFILE_SECTIONS.map((section) => (
            <li key={section.path}>
              <NavLink
                to={`/perfil/${section.path}`}
                className={({ isActive }) =>
                  `${ITEM_CLASSES} ${
                    isActive ? 'bg-action-secondary font-bold text-ink' : 'text-ink hover:bg-surface-celeste'
                  }`
                }
              >
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
                  {SECTION_ICONS[section.path]}
                </svg>
                {section.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button type="button" onClick={handleLogout} className={`${ITEM_CLASSES} mt-auto text-ink hover:bg-surface-celeste`}>
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
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Cerrar sesión
      </button>
    </aside>
    {logoutError ? (
      <div className="fixed right-6 bottom-6 z-50">
        <Notification
          variant="error"
          title="No pudimos cerrar tu sesión"
          message="Intenta de nuevo."
          onClose={() => setLogoutError(false)}
        />
      </div>
    ) : null}
    </>
  );
}
