import type { AcquireInput, FinishInput, Progress, ProgressInput, SyncCounts, SyncFailureCode, SyncLease, SyncRun, SyncState } from "./types";

export class SyncError extends Error {
  constructor(public readonly code: SyncFailureCode) { super(code); this.name = "SyncError"; }
}
export const emptyCounts = (): SyncCounts => ({ pagesFetched: 0, itemsSeen: 0, created: 0, updated: 0, unchanged: 0, skipped: 0, rejected: 0 });
export function initialState(jobId: string): SyncState {
  return { jobId, status: "idle", cursor: { page: 1, offset: 0, pageHash: null }, scanId: null, scanStartedAt: null, lastCompletedScanAt: null, lastSuccessfulRunAt: null, lastAttemptAt: null, lastErrorCode: null, leaseOwner: null, leaseFence: 0, leaseExpiresAt: 0 };
}
export function assertIdentifier(value: string): void {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new SyncError("SYNC_INVALID_RECORD");
}
export function startRun(previous: SyncState, input: AcquireInput): Progress & { lease: SyncLease } {
  const stamp = new Date(input.now).toISOString();
  const scanId = previous.scanId ?? input.runId;
  const lease = { jobId: input.jobId, runId: input.runId, scanId, fence: previous.leaseFence + 1 };
  return {
    lease,
    state: { ...previous, status: "running", scanId, scanStartedAt: previous.scanStartedAt ?? stamp, lastAttemptAt: stamp, lastErrorCode: null, leaseOwner: input.runId, leaseFence: lease.fence, leaseExpiresAt: input.now + input.leaseMs },
    run: { id: input.runId, jobId: input.jobId, scanId, status: "running", startedAt: stamp, finishedAt: null, cursorStart: { ...previous.cursor }, cursorEnd: { ...previous.cursor }, counts: emptyCounts(), errorCode: null, rejectedSamples: [] },
  };
}
export function assertLease(state: SyncState, run: SyncRun, lease: SyncLease, now: number): void {
  if (state.leaseOwner !== lease.runId || state.leaseFence !== lease.fence || state.scanId !== lease.scanId || state.jobId !== lease.jobId || run.id !== lease.runId || run.status !== "running" || state.leaseExpiresAt <= now) throw new SyncError("SYNC_LEASE_LOST");
}
export function advance(progress: Progress, input: ProgressInput, delta: Partial<SyncCounts> = {}): Progress {
  assertLease(progress.state, progress.run, input.lease, input.now);
  const actual = progress.state.cursor, expected = input.expectedCursor;
  // Firestore may reorder map keys during serialization; compare values only.
  if (actual.page !== expected.page || actual.offset !== expected.offset || actual.pageHash !== expected.pageHash || JSON.stringify(actual.seenKeys ?? []) !== JSON.stringify(expected.seenKeys ?? [])) throw new SyncError("SYNC_CURSOR_CONFLICT");
  const counts = { ...progress.run.counts };
  for (const key of Object.keys(delta) as (keyof SyncCounts)[]) counts[key] += delta[key] ?? 0;
  return { state: { ...progress.state, cursor: { ...input.nextCursor }, leaseExpiresAt: input.now + input.leaseMs }, run: { ...progress.run, cursorEnd: { ...input.nextCursor }, counts } };
}
export function finishRun(progress: Progress, input: FinishInput): Progress {
  assertLease(progress.state, progress.run, input.lease, input.now);
  const stamp = new Date(input.now).toISOString();
  const complete = input.status === "completed";
  return {
    state: { ...progress.state, status: input.status === "completed" ? "idle" : input.status, leaseOwner: null, leaseExpiresAt: 0, lastErrorCode: input.errorCode ?? null, lastSuccessfulRunAt: input.status === "failed" ? progress.state.lastSuccessfulRunAt : stamp, lastCompletedScanAt: complete ? stamp : progress.state.lastCompletedScanAt, ...(complete ? { cursor: { page: 1, offset: 0, pageHash: null }, scanId: null, scanStartedAt: null } : {}) },
    run: { ...progress.run, status: input.status, finishedAt: stamp, errorCode: input.errorCode ?? null },
  };
}
