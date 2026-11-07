import type { Place } from "@/lib/types";

export interface SyncCursor { page: number; offset: number; pageHash: string | null; seenKeys?: string[] }
export interface SyncCounts { pagesFetched: number; itemsSeen: number; created: number; updated: number; unchanged: number; skipped: number; rejected: number }
export type SyncFailureCode = "SYNC_PROVIDER_FAILED" | "SYNC_INVALID_PAGE" | "SYNC_NORMALIZATION_FAILED" | "SYNC_INVALID_RECORD" | "SYNC_UNCLASSIFIED_RECORD" | "SYNC_PERSISTENCE_FAILED" | "SYNC_LEASE_LOST" | "SYNC_CURSOR_CONFLICT" | "SYNC_LEASE_EXPIRED";
export type RunStatus = "running" | "completed" | "paused" | "failed" | "abandoned";
export interface SyncState {
  jobId: string; status: "idle" | "running" | "paused" | "failed";
  cursor: SyncCursor; scanId: string | null; scanStartedAt: string | null;
  lastCompletedScanAt: string | null; lastSuccessfulRunAt: string | null;
  lastAttemptAt: string | null; lastErrorCode: SyncFailureCode | null;
  leaseOwner: string | null; leaseFence: number; leaseExpiresAt: number;
}
export interface SyncRun {
  id: string; jobId: string; scanId: string; status: RunStatus;
  startedAt: string; finishedAt: string | null;
  cursorStart: SyncCursor; cursorEnd: SyncCursor; counts: SyncCounts;
  errorCode: SyncFailureCode | null;
  rejectedSamples: { page: number; offset: number; code: SyncFailureCode }[];
}
export interface SyncLease { jobId: string; runId: string; scanId: string; fence: number }
export interface SyncLimits { maxPages: number; maxItems: number; maxDurationMs: number; leaseMs: number }
export interface SyncDraft { place: Place; candidatePhotoUrl?: string | null; reviewWarnings?: string[] }
export interface SyncProvider {
  fetchPage(page: number): Promise<{ items: unknown[]; currentPage: number; pageCount: number; totalCount: number }>;
  normalize(raw: unknown, options: { retrievedAt: string }): SyncDraft | null;
  /** Stable source identifier prevents starvation when a partially read page changes. */
  recordKey?(raw: unknown): string | null;
  /** Only documented malformed/unclassified records may be advanced past. */
  classifyRecordError?(error: unknown): "SYNC_INVALID_RECORD" | "SYNC_UNCLASSIFIED_RECORD" | null;
}
export interface SyncCandidate { sourceId: string; sourceHash: string; draft: SyncDraft }
export interface Progress { state: SyncState; run: SyncRun }
export interface AcquireInput { jobId: string; runId: string; now: number; leaseMs: number }
export type AcquireResult = ({ kind: "acquired"; lease: SyncLease } & Progress) | { kind: "busy" | "duplicate" };
export interface ProgressInput {
  lease: SyncLease; expectedCursor: SyncCursor; nextCursor: SyncCursor; now: number; leaseMs: number;
}
export type ItemInput = ProgressInput & (
  { candidate: SyncCandidate; rejectedCode?: never; skipped?: never } |
  { candidate?: never; rejectedCode: "SYNC_INVALID_RECORD" | "SYNC_UNCLASSIFIED_RECORD"; skipped?: never } |
  { candidate?: never; rejectedCode?: never; skipped: true }
);
export interface FinishInput { lease: SyncLease; now: number; status: "completed" | "paused" | "failed"; errorCode?: SyncFailureCode }
export interface SyncStore {
  acquire(input: AcquireInput): Promise<AcquireResult>;
  checkpoint(input: ProgressInput & { pageFetched?: boolean }): Promise<Progress>;
  /** Item write, cursor and run counters must commit atomically. */
  commitItem(input: ItemInput): Promise<Progress>;
  finish(input: FinishInput): Promise<SyncRun>;
}
export interface SyncResult {
  status: "completed" | "paused" | "failed" | "busy" | "duplicate";
  runId: string; scanId: string | null; cursor: SyncCursor | null;
  counts: SyncCounts; errorCode: SyncFailureCode | null;
}
