import { placeSchema } from "@/lib/server/place-schema";
import { sourceHash } from "./hash";
import { assertIdentifier, emptyCounts, SyncError } from "./state";
import type { ItemInput, Progress, SyncCandidate, SyncFailureCode, SyncLease, SyncLimits, SyncProvider, SyncResult, SyncStore } from "./types";

export const DEFAULT_SYNC_LIMITS: SyncLimits = { maxPages: 2, maxItems: 100, maxDurationMs: 40_000, leaseMs: 120_000 };
function checkedLimits(input: Partial<SyncLimits>): SyncLimits {
  const limits = { ...DEFAULT_SYNC_LIMITS, ...input };
  if (!Number.isInteger(limits.maxPages) || limits.maxPages < 1 || limits.maxPages > 20 || !Number.isInteger(limits.maxItems) || limits.maxItems < 1 || limits.maxItems > 1000 || !Number.isInteger(limits.maxDurationMs) || limits.maxDurationMs < 1 || limits.maxDurationMs > 240_000 || !Number.isInteger(limits.leaseMs) || limits.leaseMs < 30_000 || limits.leaseMs > 600_000 || limits.leaseMs < limits.maxDurationMs + 15_000) throw new SyncError("SYNC_INVALID_RECORD");
  return limits;
}

/** Pure orchestration; only the injected provider/store may perform I/O. */
export async function runCatalogSync(input: {
  provider: SyncProvider; store: SyncStore; jobId: string; runId: string;
  limits?: Partial<SyncLimits>; now?: () => number;
}): Promise<SyncResult> {
  assertIdentifier(input.jobId); assertIdentifier(input.runId);
  const limits = checkedLimits(input.limits ?? {}), now = input.now ?? Date.now;
  const started = now(), deadline = started + limits.maxDurationMs;
  const base = { runId: input.runId, scanId: null, cursor: null, counts: emptyCounts(), errorCode: null };
  let acquisition;
  try { acquisition = await input.store.acquire({ jobId: input.jobId, runId: input.runId, now: started, leaseMs: limits.leaseMs }); }
  catch { return { ...base, status: "failed", errorCode: "SYNC_PERSISTENCE_FAILED" }; }
  if (acquisition.kind !== "acquired") return { ...base, status: acquisition.kind };
  const lease: SyncLease = acquisition.lease;
  let progress: Progress = acquisition;
  let calls = 0;
  let phase: "provider" | "normalization" | "store" = "store";
  const finish = async (status: "completed" | "paused" | "failed", errorCode?: SyncFailureCode): Promise<SyncResult> => {
    try {
      const run = await input.store.finish({ lease, status, now: now(), ...(errorCode ? { errorCode } : {}) });
      return { status, runId: run.id, scanId: run.scanId, cursor: run.cursorEnd, counts: run.counts, errorCode: run.errorCode };
    } catch (error) {
      return { status: "failed", runId: lease.runId, scanId: lease.scanId, cursor: progress.state.cursor, counts: progress.run.counts, errorCode: error instanceof SyncError ? error.code : "SYNC_PERSISTENCE_FAILED" };
    }
  };
  try {
    while (calls < limits.maxPages && progress.run.counts.itemsSeen < limits.maxItems && now() < deadline) {
      const requestedPage = progress.state.cursor.page;
      phase = "provider"; calls++;
      const page = await input.provider.fetchPage(requestedPage);
      if (!page || !Array.isArray(page.items) || page.items.length > 1000 || !Number.isInteger(page.currentPage) || !Number.isInteger(page.pageCount) || !Number.isInteger(page.totalCount) || page.pageCount < 0 || page.pageCount > 10_000 || page.totalCount < 0 || page.currentPage !== requestedPage || (page.items.length === 0 && page.totalCount > 0 && requestedPage <= page.pageCount) || (page.items.length > 0 && (requestedPage > page.pageCount || page.totalCount < page.items.length)) || (page.totalCount === 0 && (page.pageCount > 1 || page.items.length > 0))) throw new SyncError("SYNC_INVALID_PAGE");
      // Resuming by offset is safe only while the page contents are unchanged.
      const pageHash = sourceHash(page.items);
      const previousCursor = progress.state.cursor;
      const offset = previousCursor.pageHash === pageHash && previousCursor.offset <= page.items.length ? previousCursor.offset : 0;
      const seenKeys = new Set(previousCursor.seenKeys ?? []);
      phase = "store";
      progress = await input.store.checkpoint({ lease, expectedCursor: previousCursor, nextCursor: { page: requestedPage, offset, pageHash, seenKeys: [...seenKeys] }, now: now(), leaseMs: limits.leaseMs, pageFetched: true });
      if (!page.items.length) return finish("completed");
      for (let index = offset; index < page.items.length; index++) {
        if (now() >= deadline) return finish("paused");
        phase = "normalization";
        const providerKey = input.provider.recordKey?.(page.items[index]);
        const recordKey = providerKey && /^[a-zA-Z0-9_-]{1,100}$/.test(providerKey) ? `id:${providerKey}` : `hash:${sourceHash(page.items[index])}`;
        // Previously handled IDs are refreshed in the next full scan. Skipping
        // them locally avoids repeated writes and guarantees forward progress
        // through a changing page while keeping the per-run item budget.
        if (seenKeys.has(recordKey)) continue;
        if (progress.run.counts.itemsSeen >= limits.maxItems) return finish("paused");
        let item: Pick<ItemInput, "candidate" | "rejectedCode" | "skipped">;
        try {
          const draft = input.provider.normalize(page.items[index], { retrievedAt: new Date(now()).toISOString() });
          if (!draft) item = { skipped: true };
          else {
            const parsed = placeSchema.safeParse(draft.place);
            if (!parsed.success || parsed.data.dataMode !== "live" || !parsed.data.sourceId || !/^[a-zA-Z0-9_-]{1,95}$/.test(parsed.data.sourceId)) throw new SyncError("SYNC_INVALID_RECORD");
            const candidate: SyncCandidate = { sourceId: parsed.data.sourceId, sourceHash: sourceHash(page.items[index]), draft: { ...draft, place: parsed.data } };
            item = { candidate };
          }
        } catch (error) {
          const classified = error instanceof SyncError && error.code === "SYNC_INVALID_RECORD" ? "SYNC_INVALID_RECORD" : input.provider.classifyRecordError?.(error);
          if (!classified) throw new SyncError("SYNC_NORMALIZATION_FAILED");
          item = { rejectedCode: classified };
        }
        phase = "store";
        seenKeys.add(recordKey);
        if (seenKeys.size > 2000) seenKeys.delete(seenKeys.values().next().value!);
        progress = await input.store.commitItem({ ...item, lease, expectedCursor: progress.state.cursor, nextCursor: { page: requestedPage, offset: index + 1, pageHash, seenKeys: [...seenKeys] }, now: now(), leaseMs: limits.leaseMs } as ItemInput);
      }
      if (requestedPage >= page.pageCount) return finish("completed");
      phase = "store";
      progress = await input.store.checkpoint({ lease, expectedCursor: progress.state.cursor, nextCursor: { page: requestedPage + 1, offset: 0, pageHash: null }, now: now(), leaseMs: limits.leaseMs });
    }
    return finish("paused");
  } catch (error) {
    const code = error instanceof SyncError ? error.code : phase === "provider" ? "SYNC_PROVIDER_FAILED" : phase === "normalization" ? "SYNC_NORMALIZATION_FAILED" : "SYNC_PERSISTENCE_FAILED";
    return finish("failed", code);
  }
}
