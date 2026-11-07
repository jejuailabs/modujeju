import "server-only";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { getAdminServices } from "@/lib/firebase/admin";
import { assertVisitJejuEnabled } from "@/lib/visitjeju/client";
import { ServiceError } from "@/lib/server/errors";
import { getSyncReadiness } from "./config";
import { advance, assertIdentifier, finishRun, initialState, startRun, SyncError } from "./state";
import { prepareUpsert, type SourceRecord } from "./merge";
import type { AcquireInput, AcquireResult, FinishInput, ItemInput, Progress, ProgressInput, SyncRun, SyncState, SyncStore } from "./types";

export const VISITJEJU_SYNC_JOB_ID = "visitjeju-ko";
export function assertSyncEnabled(): void {
  assertVisitJejuEnabled();
  if (process.env.VISITJEJU_SYNC_ENABLED !== "true") throw new ServiceError("SYNC_DISABLED", 503);
  if (!getSyncReadiness(process.env, Date.now()).ready) throw new ServiceError("SYNC_NOT_APPROVED", 503);
}

/** Constructor injection exists for offline transaction tests, never bypasses gates. */
export class FirestoreSyncStore implements SyncStore {
  constructor(private readonly getDb: () => Firestore) {}
  private database(jobId: string): Firestore {
    assertSyncEnabled();
    if (jobId !== VISITJEJU_SYNC_JOB_ID) throw new SyncError("SYNC_INVALID_RECORD");
    return this.getDb();
  }
  private async progress(tx: Transaction, db: Firestore, jobId: string, runId: string): Promise<Progress> {
    const job = db.collection("syncJobs").doc(jobId);
    const [state, run] = await Promise.all([tx.get(job), tx.get(job.collection("runs").doc(runId))]);
    if (!state.exists || !run.exists) throw new SyncError("SYNC_LEASE_LOST");
    return { state: state.data() as SyncState, run: run.data() as SyncRun };
  }
  private persist(tx: Transaction, db: Firestore, progress: Progress): void {
    const job = db.collection("syncJobs").doc(progress.state.jobId);
    tx.set(job, progress.state);
    tx.set(job.collection("runs").doc(progress.run.id), progress.run);
  }
  async acquire(input: AcquireInput): Promise<AcquireResult> {
    assertIdentifier(input.runId);
    const db = this.database(input.jobId), job = db.collection("syncJobs").doc(input.jobId);
    return db.runTransaction(async (tx) => {
      const [stateSnapshot, runSnapshot] = await Promise.all([tx.get(job), tx.get(job.collection("runs").doc(input.runId))]);
      if (runSnapshot.exists) return { kind: "duplicate" };
      const state = stateSnapshot.exists ? stateSnapshot.data() as SyncState : initialState(input.jobId);
      if (state.leaseOwner && state.leaseExpiresAt > input.now) return { kind: "busy" };
      if (state.leaseOwner) {
        const abandoned = job.collection("runs").doc(state.leaseOwner);
        const old = await tx.get(abandoned);
        if (old.exists && old.data()?.status === "running") tx.update(abandoned, { status: "abandoned", finishedAt: new Date(input.now).toISOString(), errorCode: "SYNC_LEASE_EXPIRED" });
      }
      const acquired = startRun(state, input);
      this.persist(tx, db, acquired);
      return { kind: "acquired", ...acquired };
    });
  }
  async checkpoint(input: ProgressInput & { pageFetched?: boolean }): Promise<Progress> {
    const db = this.database(input.lease.jobId);
    return db.runTransaction(async (tx) => {
      const current = await this.progress(tx, db, input.lease.jobId, input.lease.runId);
      const next = advance(current, input, input.pageFetched ? { pagesFetched: 1 } : {});
      this.persist(tx, db, next);
      return next;
    });
  }
  async commitItem(input: ItemInput): Promise<Progress> {
    const db = this.database(input.lease.jobId);
    return db.runTransaction(async (tx) => {
      const current = await this.progress(tx, db, input.lease.jobId, input.lease.runId);
      advance(current, input);
      let next: Progress;
      if (input.candidate) {
        const sourceRef = db.collection("sourcePlaces").doc(input.candidate.sourceId);
        const sourceSnapshot = await tx.get(sourceRef);
        const source = sourceSnapshot.exists ? sourceSnapshot.data() as SourceRecord : null;
        const id = source?.placeId ?? input.candidate.draft.place.id;
        assertIdentifier(id);
        const placeRef = db.collection("places").doc(id), placeSnapshot = await tx.get(placeRef);
        const upsert = prepareUpsert(placeSnapshot.exists ? placeSnapshot.data()! : null, source, input.candidate, new Date(input.now).toISOString(), input.lease.scanId);
        next = advance(current, input, { itemsSeen: 1, [upsert.outcome]: 1 });
        tx.set(sourceRef, upsert.source);
        if (upsert.document) tx.set(placeRef, upsert.document);
      } else {
        next = advance(current, input, { itemsSeen: 1, ...(input.skipped ? { skipped: 1 } : { rejected: 1 }) });
        if (input.rejectedCode && next.run.rejectedSamples.length < 25) next.run.rejectedSamples.push({ page: input.expectedCursor.page, offset: input.expectedCursor.offset, code: input.rejectedCode });
      }
      this.persist(tx, db, next);
      return next;
    });
  }
  async finish(input: FinishInput): Promise<SyncRun> {
    const db = this.database(input.lease.jobId);
    return db.runTransaction(async (tx) => {
      const next = finishRun(await this.progress(tx, db, input.lease.jobId, input.lease.runId), input);
      this.persist(tx, db, next);
      return next.run;
    });
  }
}

export function createFirestoreSyncStore(): SyncStore {
  assertSyncEnabled();
  return new FirestoreSyncStore(() => getAdminServices().db);
}

/** Read-only status remains available when sync is paused; caller must enforce admin auth. */
export async function readFirestoreSyncStatus() {
  const { db } = getAdminServices();
  const job = db.collection("syncJobs").doc(VISITJEJU_SYNC_JOB_ID);
  const [state, history] = await Promise.all([job.get(), job.collection("runs").orderBy("startedAt", "desc").limit(20).get()]);
  return { state: state.exists ? state.data() as SyncState : initialState(VISITJEJU_SYNC_JOB_ID), runs: history.docs.map((doc) => doc.data() as SyncRun) };
}
