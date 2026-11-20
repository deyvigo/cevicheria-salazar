const LIMA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' });
const DAY_MS = 24 * 60 * 60 * 1000;

// Lima has no daylight saving, so stepping by 24 hours always lands on the previous calendar day
export function limaDay(now: Date, daysAgo = 0): string {
  return LIMA_DAY.format(new Date(now.getTime() - daysAgo * DAY_MS));
}

export function limaMonthStart(now: Date): string {
  return `${limaDay(now).slice(0, 8)}01`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}
