import "server-only";
import { invalidatePublicPlaces } from "@/lib/server/public-places";
import { runCatalogSync } from "./engine";
import { assertSyncEnabled, createFirestoreSyncStore, VISITJEJU_SYNC_JOB_ID } from "./firestore-store";
import { createVisitJejuSyncProvider } from "./visitjeju-provider";
import type { SyncLimits } from "./types";
import { getSyncReadiness } from "./config";
import { ServiceError } from "@/lib/server/errors";

/** The invoking route/CLI owns authentication, scheduling and approved budgets. */
export async function runVisitJejuSync(input: { runId: string; limits?: Partial<SyncLimits> }) {
  assertSyncEnabled();
  const approved = getSyncReadiness(process.env, Date.now()).limits;
  const limits = { ...approved, ...input.limits };
  if (limits.maxPages > approved.maxPages || limits.maxItems > approved.maxItems || limits.maxDurationMs > approved.maxDurationMs || limits.leaseMs !== approved.leaseMs) throw new ServiceError("SYNC_LIMITS_CONFIGURATION", 503);
  const result = await runCatalogSync({ provider: createVisitJejuSyncProvider(), store: createFirestoreSyncStore(), jobId: VISITJEJU_SYNC_JOB_ID, runId: input.runId, limits });
  // A later page can fail after valid item transactions have already committed.
  if (result.counts.created + result.counts.updated > 0) invalidatePublicPlaces();
  return result;
}
