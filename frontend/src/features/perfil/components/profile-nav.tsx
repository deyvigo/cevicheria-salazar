import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { PERSON_ICON_PATHS } from '@/features/perfil/components/person-icon';
import { PROFILE_SECTIONS } from '@/features/perfil/profile-sections';

const SECTION_ICONS: Record<(typeof PROFILE_SECTIONS)[number]['path'], ReactNode> = {
  'mi-informacion': PERSON_ICON_PATHS,
};

const ITEM_CLASSES =
  'flex min-h-12 w-full items-center gap-3 rounded-md px-4 text-left text-base focus-visible:shadow-focus focus-visible:outline-none';

export function ProfileNav() {
  return (
    <aside className="sticky top-6 flex w-56 flex-none flex-col rounded-lg border border-border bg-surface p-2">
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
    </aside>
  );
}
