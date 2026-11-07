import { createHash, timingSafeEqual } from "node:crypto";
import {
  dailySyncRunId,
  getSyncReadiness,
  isConfiguredCronSecret,
} from "@/lib/sync/config";
import { runVisitJejuSync } from "@/lib/sync/runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function authorized(request: Request, secret: string): boolean {
  const provided = request.headers.get("authorization") ?? "";
  // Equal-size digests avoid exposing a timing difference for token length.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(`Bearer ${secret}`));
}

/** The schedule is deliberately inactive until provider terms and all costs are approved. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!isConfiguredCronSecret(secret))
    return json({ error: { code: "CRON_NOT_CONFIGURED" } }, 503);
  if (!authorized(request, secret))
    return json({ error: { code: "UNAUTHORIZED" } }, 401);
  const now = Date.now();
  const readiness = getSyncReadiness(process.env, now);
  if (!readiness.ready)
    return json(
      { error: { code: "SYNC_NOT_READY", blockers: readiness.blockers } },
      503,
    );
  try {
    // Request parameters never control the page, quota, locale, run ID or job ID.
    const result = await runVisitJejuSync({
      runId: dailySyncRunId(now),
      limits: readiness.limits,
    });
    const { status, runId, scanId, cursor, counts, errorCode } = result;
    return json(
      { status, runId, scanId, cursor, counts, errorCode },
      status === "failed" ? 503 : 200,
    );
  } catch {
    // Provider/SDK errors may contain keys, URLs or credentials. Never log or return them.
    return json({ error: { code: "SYNC_EXECUTION_FAILED" } }, 503);
  }
}

/** Next.js otherwise derives HEAD from GET; a health check must never mutate the catalog. */
export function HEAD() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "GET", "Cache-Control": "no-store" },
  });
}
