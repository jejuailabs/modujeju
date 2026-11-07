import { advance, assertIdentifier, finishRun, initialState, startRun, SyncError } from "./state";
import { prepareUpsert, type SourceRecord, type StoredDocument } from "./merge";
import type { AcquireInput, AcquireResult, FinishInput, ItemInput, Progress, ProgressInput, SyncRun, SyncState, SyncStore } from "./types";

/** Offline execution/test adapter. It never initializes Firebase or writes files. */
export class MemorySyncStore implements SyncStore {
  readonly states = new Map<string, SyncState>();
  readonly runs = new Map<string, SyncRun>();
  readonly places = new Map<string, StoredDocument>();
  readonly sources = new Map<string, SourceRecord>();
  async acquire(input: AcquireInput): Promise<AcquireResult> {
    assertIdentifier(input.jobId); assertIdentifier(input.runId);
    if (this.runs.has(input.runId)) return { kind: "duplicate" };
    const state = this.states.get(input.jobId) ?? initialState(input.jobId);
    if (state.leaseOwner && state.leaseExpiresAt > input.now) return { kind: "busy" };
    if (state.leaseOwner) {
      const previous = this.runs.get(state.leaseOwner);
      if (previous) this.runs.set(previous.id, { ...previous, status: "abandoned", finishedAt: new Date(input.now).toISOString(), errorCode: "SYNC_LEASE_EXPIRED" });
    }
    const acquired = startRun(state, input);
    this.save(acquired);
    return { kind: "acquired", ...structuredClone(acquired) };
  }
  private progress(jobId: string, runId: string): Progress {
    const state = this.states.get(jobId), run = this.runs.get(runId);
    if (!state || !run) throw new SyncError("SYNC_LEASE_LOST");
    return { state, run };
  }
  private save(progress: Progress): Progress {
    this.states.set(progress.state.jobId, structuredClone(progress.state));
    this.runs.set(progress.run.id, structuredClone(progress.run));
    return structuredClone(progress);
  }
  async checkpoint(input: ProgressInput & { pageFetched?: boolean }): Promise<Progress> {
    return this.save(advance(this.progress(input.lease.jobId, input.lease.runId), input, input.pageFetched ? { pagesFetched: 1 } : {}));
  }
  async commitItem(input: ItemInput): Promise<Progress> {
    const current = this.progress(input.lease.jobId, input.lease.runId);
    // Validate lease/cursor before any item mutation, including test-double writes.
    advance(current, input);
    let next: Progress;
    if (input.candidate) {
      const source = this.sources.get(input.candidate.sourceId) ?? null;
      const id = source?.placeId ?? input.candidate.draft.place.id;
      const upsert = prepareUpsert(this.places.get(id) ?? null, source, input.candidate, new Date(input.now).toISOString(), input.lease.scanId);
      next = advance(current, input, { itemsSeen: 1, [upsert.outcome]: 1 });
      this.sources.set(input.candidate.sourceId, structuredClone(upsert.source));
      if (upsert.document) this.places.set(id, structuredClone(upsert.document));
    } else {
      next = advance(current, input, { itemsSeen: 1, ...(input.skipped ? { skipped: 1 } : { rejected: 1 }) });
      if (input.rejectedCode && next.run.rejectedSamples.length < 25) next.run.rejectedSamples.push({ page: input.expectedCursor.page, offset: input.expectedCursor.offset, code: input.rejectedCode });
    }
    return this.save(next);
  }
  async finish(input: FinishInput): Promise<SyncRun> {
    return this.save(finishRun(this.progress(input.lease.jobId, input.lease.runId), input)).run;
  }
}
