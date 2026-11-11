/** Pure helpers for the visit counters and the admin dashboard. */

export const SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;
const BOT_PATTERN = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|lighthouse|monitor/i;

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

/** Asia/Seoul calendar day, YYYY-MM-DD. */
export function seoulDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
}

export function dailyDocId(day: string): string {
  return `daily-${day}`;
}

/** Last `count` Seoul days ending at `now`, oldest first. */
export function lastDays(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    seoulDay(new Date(now.getTime() - (count - 1 - index) * 86_400_000)),
  );
}

export interface DailyDoc {
  pageViews?: unknown;
  uniqueVisitors?: unknown;
  placeViews?: unknown;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function dailySeries(days: string[], docs: Map<string, DailyDoc | undefined>) {
  return days.map((day) => ({
    day,
    pageViews: count(docs.get(day)?.pageViews),
    uniqueVisitors: count(docs.get(day)?.uniqueVisitors),
  }));
}

export function topEntries(totals: Map<string, number>, limit: number) {
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id, views]) => ({ id, count: views }));
}

export function topViewedPlaces(docs: Iterable<DailyDoc | undefined>, limit = 10) {
  const totals = new Map<string, number>();
  for (const doc of docs) {
    const views = doc?.placeViews;
    if (!views || typeof views !== "object") continue;
    for (const [slug, value] of Object.entries(views)) {
      if (SLUG_PATTERN.test(slug)) totals.set(slug, (totals.get(slug) ?? 0) + count(value));
    }
  }
  return topEntries(totals, limit);
}

export function topSavedPlaces(placeIds: Iterable<string>, limit = 10) {
  const totals = new Map<string, number>();
  for (const id of placeIds) totals.set(id, (totals.get(id) ?? 0) + 1);
  return topEntries(totals, limit);
}

export function countSignups(creationTimes: Iterable<string | undefined>, now: Date) {
  let last7 = 0;
  let last30 = 0;
  for (const value of creationTimes) {
    const time = value ? Date.parse(value) : NaN;
    if (!Number.isFinite(time)) continue;
    const age = now.getTime() - time;
    if (age < 0) continue;
    if (age <= 7 * 86_400_000) last7 += 1;
    if (age <= 30 * 86_400_000) last30 += 1;
  }
  return { last7, last30 };
}
