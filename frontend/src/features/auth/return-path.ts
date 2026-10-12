const STORAGE_KEY = 'salazar.return-path';
// Long enough for the Google round trip, short enough that an abandoned attempt can't hijack a later login
const MAX_AGE_MS = 10 * 60 * 1000;

const AUTH_PATHS = ['/iniciar-sesion', '/registro', '/olvide-contrasena', '/restablecer-contrasena'];

// The path travels through router state and storage, so it is untrusted: only same-origin app paths are allowed
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }
  const pathname = value.split(/[?#]/)[0];
  return AUTH_PATHS.includes(pathname) ? null : value;
}

export function returnPathFromState(state: unknown): string | null {
  return safeReturnPath((state as { from?: unknown } | null)?.from);
}

// The Google flow leaves the app, so the origin screen has to outlive the page
export function rememberReturnPath(path: string | null) {
  try {
    if (path) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ path, at: Date.now() }));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // without storage the customer lands on the home page
  }
}

export function takeReturnPath(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (typeof stored.at !== 'number' || Date.now() - stored.at > MAX_AGE_MS) return null;
    return safeReturnPath(stored.path);
  } catch {
    return null;
  }
}
