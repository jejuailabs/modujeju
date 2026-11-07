import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
vi.mock("server-only", () => ({}));
import { FirestoreSyncStore } from "./firestore-store";
import { createUnknownFacts, type Place } from "@/lib/types";
import { sourceHash } from "./hash";

type Data = Record<string, unknown>;
function transactionDouble() {
  const documents = new Map<string, Data>();
  const reference = (path: string) => ({ path, collection: (name: string) => ({ doc: (id: string) => reference(`${path}/${name}/${id}`) }) });
  const db = { collection: (name: string) => ({ doc: (id: string) => reference(`${name}/${id}`) }), async runTransaction<T>(callback: (tx: unknown) => Promise<T>) {
    const pending = new Map<string, Data>(); let hasWrites = false;
    const tx = {
      async get(ref: { path: string }) { if (hasWrites) throw new Error("Firestore reads must precede writes"); const value = documents.get(ref.path); return { exists: !!value, data: () => value ? structuredClone(value) : undefined }; },
      set(ref: { path: string }, value: Data) { hasWrites = true; pending.set(ref.path, structuredClone(value)); },
      update(ref: { path: string }, value: Data) { hasWrites = true; pending.set(ref.path, { ...structuredClone(documents.get(ref.path)), ...structuredClone(value) }); },
    };
    const result = await callback(tx);
    for (const [path, value] of pending) documents.set(path, value);
    return result;
  } };
  return { documents, db: db as unknown as Firestore };
}
function approvedTestEnvironment() {
  for (const name of ["CLOUD_SERVICES_ENABLED", "VISITJEJU_API_ENABLED", "VISITJEJU_USAGE_APPROVED", "VISITJEJU_SYNC_ENABLED", "VISITJEJU_SYNC_COST_APPROVED", "VISITJEJU_STORAGE_APPROVED"]) vi.stubEnv(name, "true");
  vi.stubEnv("VISITJEJU_SYNC_APPROVAL_EXPIRES_AT", new Date(Date.now() + 86_400_000).toISOString());
  vi.stubEnv("VISITJEJU_API_URL", "https://api.visitjeju.net/vsjApi/contents/searchList");
  vi.stubEnv("VISITJEJU_API_KEY", "not-a-real-key"); vi.stubEnv("VISITJEJU_API_KEY_PARAM", "apiKey");
  vi.stubEnv("FIREBASE_ADMIN_PROJECT_ID", "fake-test-project"); vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "test@example.invalid"); vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----TEST-ONLY");
  vi.stubEnv("CRON_SECRET", "a".repeat(40));
}
beforeEach(approvedTestEnvironment);
afterEach(() => vi.unstubAllEnvs());
const labels = { ko: "자료", en: "자료", zh: "자료", ja: "자료" };
const place: Place = { id: "vj-A", slug: "vj-a", name: labels, summary: labels, address: labels, district: labels, region: "north", type: "cafe", lat: null, lng: null, image: "/assets/icons/map-pin.svg", price: { amount: null, unit: "drink", petExtra: null }, durationMinutes: null, facts: createUnknownFacts(), sourceId: "A", sourceUrl: "https://www.visitjeju.net/kr/detail/view?contentsid=A", verifiedAt: null, dataMode: "live" };

describe("Firestore sync transaction adapter without any network", () => {
  it("checks disabled/approval gates before even obtaining a database handle", async () => {
    const getDb = vi.fn(); const store = new FirestoreSyncStore(getDb);
    vi.stubEnv("VISITJEJU_SYNC_COST_APPROVED", "false");
    await expect(store.acquire({ jobId: "visitjeju-ko", runId: "run", now: Date.now(), leaseMs: 120_000 })).rejects.toMatchObject({ code: "SYNC_NOT_APPROVED" });
    expect(getDb).not.toHaveBeenCalled();
  });
  it("atomically writes source, draft, item cursor and run counters", async () => {
    const fake = transactionDouble(), store = new FirestoreSyncStore(() => fake.db), now = Date.now();
    const acquired = await store.acquire({ jobId: "visitjeju-ko", runId: "run", now, leaseMs: 120_000 });
    if (acquired.kind !== "acquired") throw new Error("fixture lease");
    await store.commitItem({ lease: acquired.lease, expectedCursor: acquired.state.cursor, nextCursor: { page: 1, offset: 1, pageHash: null }, now, leaseMs: 120_000, candidate: { sourceId: "A", sourceHash: sourceHash({ id: "A" }), draft: { place } } });
    expect(fake.documents.get("sourcePlaces/A")).toMatchObject({ eligible: true, sourceId: "A", lastSeenScanId: "run" });
    expect(fake.documents.get("places/vj-A")).toMatchObject({ status: "draft" });
    expect(fake.documents.get("syncJobs/visitjeju-ko")).toMatchObject({ cursor: { offset: 1 } });
    expect(fake.documents.get("syncJobs/visitjeju-ko/runs/run")).toMatchObject({ counts: { created: 1, itemsSeen: 1 } });
  });
  it("rolls back an invalid source collision without advancing the checkpoint", async () => {
    const fake = transactionDouble(), store = new FirestoreSyncStore(() => fake.db), now = Date.now();
    fake.documents.set("places/vj-A", { ...place, sourceId: "OTHER", status: "published" });
    const acquired = await store.acquire({ jobId: "visitjeju-ko", runId: "run", now, leaseMs: 120_000 });
    if (acquired.kind !== "acquired") throw new Error("fixture lease");
    await expect(store.commitItem({ lease: acquired.lease, expectedCursor: acquired.state.cursor, nextCursor: { page: 1, offset: 1, pageHash: null }, now, leaseMs: 120_000, candidate: { sourceId: "A", sourceHash: sourceHash({ id: "A" }), draft: { place } } })).rejects.toMatchObject({ code: "SYNC_INVALID_RECORD" });
    expect(fake.documents.has("sourcePlaces/A")).toBe(false);
    expect(fake.documents.get("syncJobs/visitjeju-ko")).toMatchObject({ cursor: { offset: 0 } });
    expect(fake.documents.get("places/vj-A")?.sourceId).toBe("OTHER");
  });
});
