import type { SyncLimits } from "./types";

export type SyncEnvironment = Readonly<Record<string, string | undefined>>;
export type SyncReadinessBlocker =
  | "SYNC_DISABLED"
  | "CLOUD_DISABLED"
  | "VISITJEJU_DISABLED"
  | "USAGE_NOT_APPROVED"
  | "COST_NOT_APPROVED"
  | "STORAGE_NOT_APPROVED"
  | "APPROVAL_EXPIRED_OR_MISSING"
  | "PROVIDER_CONFIGURATION"
  | "FIREBASE_CONFIGURATION"
  | "CRON_SECRET_CONFIGURATION"
  | "SYNC_LIMITS_CONFIGURATION";

export const SYNC_JOB_ID = "visitjeju-ko";
export const SYNC_ROUTE_MAX_SECONDS = 60;

/** Only safe operational metadata is returned. This function never starts an SDK or request. */
export function getSyncReadiness(
  env: SyncEnvironment = process.env,
  now: number | Date = Date.now(),
): { ready: boolean; blockers: SyncReadinessBlocker[]; limits: SyncLimits } {
  const blockers: SyncReadinessBlocker[] = [];
  const gates: [string, SyncReadinessBlocker][] = [
    ["VISITJEJU_SYNC_ENABLED", "SYNC_DISABLED"],
    ["CLOUD_SERVICES_ENABLED", "CLOUD_DISABLED"],
    ["VISITJEJU_API_ENABLED", "VISITJEJU_DISABLED"],
    ["VISITJEJU_USAGE_APPROVED", "USAGE_NOT_APPROVED"],
    ["VISITJEJU_SYNC_COST_APPROVED", "COST_NOT_APPROVED"],
    ["VISITJEJU_STORAGE_APPROVED", "STORAGE_NOT_APPROVED"],
  ];
  for (const [key, code] of gates) if (env[key] !== "true") blockers.push(code);

  const expiry = env.VISITJEJU_SYNC_APPROVAL_EXPIRES_AT ?? "";
  const timestamp = now instanceof Date ? now.getTime() : now;
  const parsedExpiry = Date.parse(expiry);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(expiry) ||
    !Number.isFinite(timestamp) ||
    !Number.isFinite(parsedExpiry) ||
    (Number.isFinite(parsedExpiry) &&
      new Date(parsedExpiry).toISOString() !==
        (expiry.includes(".") ? expiry : expiry.replace("Z", ".000Z"))) ||
    parsedExpiry <= timestamp
  )
    blockers.push("APPROVAL_EXPIRED_OR_MISSING");

  let endpointValid = false;
  try {
    const url = new URL(env.VISITJEJU_API_URL ?? "");
    endpointValid =
      url.protocol === "https:" &&
      url.hostname === "api.visitjeju.net" &&
      url.pathname === "/vsjApi/contents/searchList" &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash;
  } catch {
    /* Missing or malformed configuration fails closed. */
  }
  if (
    !env.VISITJEJU_API_KEY?.trim() ||
    !["apiKey", "apikey"].includes(env.VISITJEJU_API_KEY_PARAM ?? "") ||
    !endpointValid
  )
    blockers.push("PROVIDER_CONFIGURATION");

  if (
    !env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
    !env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() ||
    !env.FIREBASE_ADMIN_PRIVATE_KEY?.startsWith("-----BEGIN PRIVATE KEY-----")
  )
    blockers.push("FIREBASE_CONFIGURATION");
  if (!isConfiguredCronSecret(env.CRON_SECRET))
    blockers.push("CRON_SECRET_CONFIGURATION");

  const readLimit = (key: string, fallback: number, max: number) => {
    const raw = env[key];
    if (raw === undefined || raw === "") return fallback;
    const value = Number(raw);
    if (
      !/^\d+$/.test(raw) ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > max
    ) {
      if (!blockers.includes("SYNC_LIMITS_CONFIGURATION"))
        blockers.push("SYNC_LIMITS_CONFIGURATION");
      return fallback;
    }
    return value;
  };
  const limits: SyncLimits = {
    maxPages: readLimit("VISITJEJU_SYNC_MAX_PAGES", 2, 2),
    maxItems: readLimit("VISITJEJU_SYNC_MAX_ITEMS", 100, 100),
    maxDurationMs: 40_000,
    leaseMs: 120_000,
  };
  return { ready: blockers.length === 0, blockers, limits };
}

export function isConfiguredCronSecret(
  secret: string | undefined,
): secret is string {
  return typeof secret === "string" && /^[a-zA-Z0-9_-]{32,256}$/.test(secret);
}

/** The store deduplicates this ID, bounding provider work to one invocation per UTC day. */
export function dailySyncRunId(now = Date.now()): string {
  return `${SYNC_JOB_ID}-${new Date(now).toISOString().slice(0, 10).replaceAll("-", "")}`;
}
