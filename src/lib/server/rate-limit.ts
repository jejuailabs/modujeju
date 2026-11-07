import { createHash } from "node:crypto";
import { ServiceError } from "./errors";

type Window = { count: number; resetAt: number };
const buckets = new Map<string, Window>();

/** Process-local abuse mitigation. A distributed limiter is needed before multi-instance launch. */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): void {
  for (const [id, bucket] of buckets)
    if (bucket.resetAt <= now) buckets.delete(id);
  const existing = buckets.get(key);
  if (existing && existing.count >= limit)
    throw new ServiceError("RATE_LIMITED", 429);
  if (!existing && buckets.size >= 10_000)
    throw new ServiceError("RATE_LIMITED", 429);
  buckets.set(key, {
    count: (existing?.count ?? 0) + 1,
    resetAt: existing?.resetAt ?? now + windowMs,
  });
}

export function requestRateKey(request: Request, scope: string): string {
  // Only use a proxy-injected header when the deployment explicitly trusts it.
  const ip =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : undefined;
  return `${scope}:${createHash("sha256")
    .update(ip || "shared-local")
    .digest("hex")}`;
}
