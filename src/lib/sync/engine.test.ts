import { describe, expect, it, vi } from "vitest";
import { createUnknownFacts, type Place } from "@/lib/types";
import { runCatalogSync } from "./engine";
import { MemorySyncStore } from "./memory-store";
import { sourceHash } from "./hash";
import type { ItemInput, SyncProvider } from "./types";

const stamp = Date.parse("2026-11-08T00:00:00Z");
const labels = (value: string) => ({ ko: value, en: value, zh: value, ja: value });
export function draft(id: string, title = id): { place: Place } {
  return { place: { id: `vj-${id}`, slug: `vj-${id.toLowerCase()}`, name: labels(title), summary: labels("Source introduction"), address: labels("제주시 실제 주소"), district: labels("제주시"), region: "north", type: "cafe", lat: null, lng: null, image: "/assets/icons/map-pin.svg", imageKind: "placeholder", price: { amount: null, unit: "drink", petExtra: null }, durationMinutes: null, facts: createUnknownFacts(), sourceId: id, sourceUrl: `https://www.visitjeju.net/kr/detail/view?contentsid=${id}`, retrievedAt: new Date(stamp).toISOString(), verifiedAt: null, dataMode: "live" } };
}
function provider(pages: { id: string; title?: string }[][]): SyncProvider {
  return { fetchPage: vi.fn(async (page: number) => ({ items: pages[page - 1] ?? [], currentPage: page, pageCount: pages.length, totalCount: pages.flat().length })), normalize(raw) { const item = raw as { id: string; title?: string }; return draft(item.id, item.title); } };
}
function run(store: MemorySyncStore, source: SyncProvider, runId: string, maxItems = 100, maxPages = 2) {
  return runCatalogSync({ store, provider: source, jobId: "visitjeju-ko", runId, limits: { maxItems, maxPages }, now: () => stamp });
}

describe("bounded resumable catalog sync", () => {
  it("resumes a partial page and traverses every remaining page", async () => {
    const store = new MemorySyncStore(), source = provider([[{ id: "A" }, { id: "B" }, { id: "C" }], [{ id: "D" }]]);
    const first = await run(store, source, "one", 2);
    expect(first).toMatchObject({ status: "paused", cursor: { page: 1, offset: 2 }, counts: { created: 2, itemsSeen: 2 } });
    const second = await run(store, source, "two", 2);
    expect(second).toMatchObject({ status: "completed", scanId: "one", counts: { created: 2, itemsSeen: 2 } });
    expect([...store.sources.keys()]).toEqual(["A", "B", "C", "D"]);
    expect(store.states.get("visitjeju-ko")).toMatchObject({ cursor: { page: 1, offset: 0 }, scanId: null, lastCompletedScanAt: new Date(stamp).toISOString() });
  });
  it("respects the page bound and starts a new scan after completing all pages", async () => {
    const store = new MemorySyncStore(), source = provider([[{ id: "A" }], [{ id: "B" }], [{ id: "C" }]]);
    expect(await run(store, source, "one", 100, 1)).toMatchObject({ status: "paused", cursor: { page: 2, offset: 0 } });
    expect(await run(store, source, "two", 100, 1)).toMatchObject({ status: "paused", cursor: { page: 3, offset: 0 } });
    expect(await run(store, source, "three", 100, 1)).toMatchObject({ status: "completed", scanId: "one" });
    expect(await run(store, source, "four", 100, 1)).toMatchObject({ status: "paused", scanId: "four", counts: { unchanged: 1 } });
  });
  it("restarts a changed partial page idempotently rather than skipping moved records", async () => {
    const store = new MemorySyncStore();
    await run(store, provider([[{ id: "A" }, { id: "B" }]]), "one", 1);
    const result = await run(store, provider([[{ id: "B" }, { id: "A" }, { id: "C" }]]), "two", 3);
    expect(result).toMatchObject({ status: "completed", counts: { created: 2, unchanged: 0 } });
    expect([...store.sources.keys()].sort()).toEqual(["A", "B", "C"]);
  });
  it("does not starve later records when early records change on every resumed page", async () => {
    const store = new MemorySyncStore();
    const source = (title: string) => ({ ...provider([[{ id: "A", title }, { id: "B" }, { id: "C" }]]), recordKey: (raw: unknown) => (raw as { id: string }).id });
    await run(store, source("version-one"), "one", 1);
    await run(store, source("version-two"), "two", 1);
    expect(await run(store, source("version-three"), "three", 1)).toMatchObject({ status: "completed", counts: { created: 1 } });
    expect([...store.sources.keys()]).toEqual(["A", "B", "C"]);
  });
  it("keeps the last good records and full-scan success marker when the next page fails", async () => {
    const store = new MemorySyncStore();
    await run(store, provider([[{ id: "A" }]]), "baseline");
    const priorSuccess = store.states.get("visitjeju-ko")?.lastCompletedScanAt;
    const source = provider([[{ id: "A", title: "updated" }], [{ id: "B" }]]);
    source.fetchPage = vi.fn(async (page) => { if (page === 2) throw new Error("apiKey=SECRET https://provider.invalid/?secret=VALUE"); return { items: [{ id: "A", title: "updated" }], currentPage: 1, pageCount: 2, totalCount: 2 }; });
    const failed = await run(store, source, "failure");
    expect(failed).toMatchObject({ status: "failed", errorCode: "SYNC_PROVIDER_FAILED", cursor: { page: 2, offset: 0 } });
    expect(store.sources.get("A")?.place.name.ko).toBe("updated");
    expect(store.states.get("visitjeju-ko")?.lastCompletedScanAt).toBe(priorSuccess);
    expect(JSON.stringify([...store.runs.values()])).not.toMatch(/SECRET|VALUE|provider.invalid/);
    expect(await run(store, provider([[{ id: "A", title: "updated" }], [{ id: "B" }]]), "resume")).toMatchObject({ status: "completed", scanId: "failure", counts: { created: 1 } });
  });
  it("does not delete or hide a record after it is absent from a later complete scan", async () => {
    const store = new MemorySyncStore();
    await run(store, provider([[{ id: "A" }, { id: "B" }]]), "one");
    await run(store, provider([[{ id: "A" }]]), "two");
    expect(store.sources.get("B")).toMatchObject({ eligible: true, lastSeenScanId: "one" });
    expect(store.places.get("vj-B")?.status).toBe("draft");
  });
  it("counts known invalid records without replacing previous source data", async () => {
    const store = new MemorySyncStore(), source = provider([[{ id: "A" }, { id: "B" }]]);
    source.normalize = (raw) => { if ((raw as { id: string }).id === "A") throw new Error("known invalid"); return draft("B"); };
    source.classifyRecordError = () => "SYNC_UNCLASSIFIED_RECORD";
    const result = await run(store, source, "one");
    expect(result).toMatchObject({ status: "completed", counts: { rejected: 1, created: 1, itemsSeen: 2 } });
    expect(store.runs.get("one")?.rejectedSamples).toEqual([{ page: 1, offset: 0, code: "SYNC_UNCLASSIFIED_RECORD" }]);
  });
  it("holds the cursor at the failed item if persistence fails", async () => {
    class FailingStore extends MemorySyncStore { fail = true; override async commitItem(input: ItemInput) { if (input.expectedCursor.offset === 1 && this.fail) { this.fail = false; throw new Error("private database detail"); } return super.commitItem(input); } }
    const store = new FailingStore(), source = provider([[{ id: "A" }, { id: "B" }]]);
    expect(await run(store, source, "one")).toMatchObject({ status: "failed", cursor: { offset: 1 }, counts: { created: 1 }, errorCode: "SYNC_PERSISTENCE_FAILED" });
    expect(await run(store, source, "two")).toMatchObject({ status: "completed", counts: { created: 1, unchanged: 0 } });
  });
  it("blocks overlapping runs and fences an expired lease before item mutation", async () => {
    const store = new MemorySyncStore(), source = provider([[{ id: "A" }]]);
    const first = await store.acquire({ jobId: "visitjeju-ko", runId: "first", now: stamp, leaseMs: 30_000 });
    if (first.kind !== "acquired") throw new Error("fixture lease");
    expect(await run(store, source, "second")).toMatchObject({ status: "busy" });
    expect(source.fetchPage).not.toHaveBeenCalled();
    const next = await store.acquire({ jobId: "visitjeju-ko", runId: "next", now: stamp + 30_001, leaseMs: 30_000 });
    expect(next.kind).toBe("acquired");
    await expect(store.commitItem({ lease: first.lease, expectedCursor: first.state.cursor, nextCursor: { page: 1, offset: 1, pageHash: null }, now: stamp + 30_001, leaseMs: 30_000, candidate: { sourceId: "A", sourceHash: sourceHash({ id: "A" }), draft: draft("A") } })).rejects.toMatchObject({ code: "SYNC_LEASE_LOST" });
    expect(store.sources.size).toBe(0);
    expect(store.runs.get("first")?.status).toBe("abandoned");
  });
  it("deduplicates a run ID before calling the provider again", async () => {
    const store = new MemorySyncStore(), source = provider([[{ id: "A" }]]);
    await run(store, source, "daily");
    expect(await run(store, source, "daily")).toMatchObject({ status: "duplicate" });
    expect(source.fetchPage).toHaveBeenCalledTimes(1);
  });
  it("compares checkpoint values independently of Firestore map-key ordering", async () => {
    const store = new MemorySyncStore();
    const acquired = await store.acquire({ jobId: "visitjeju-ko", runId: "one", now: stamp, leaseMs: 120_000 });
    if (acquired.kind !== "acquired") throw new Error("fixture lease");
    await expect(store.checkpoint({ lease: acquired.lease, expectedCursor: { offset: 0, pageHash: null, page: 1 }, nextCursor: { page: 2, offset: 0, pageHash: null }, now: stamp, leaseMs: 120_000 })).resolves.toMatchObject({ state: { cursor: { page: 2 } } });
  });
  it("rejects inconsistent page metadata before any record mutation", async () => {
    const store = new MemorySyncStore(), source = provider([[{ id: "A" }]]);
    source.fetchPage = async () => ({ items: [{ id: "A" }], currentPage: 1, pageCount: 0, totalCount: 1 });
    expect(await run(store, source, "one")).toMatchObject({ status: "failed", errorCode: "SYNC_INVALID_PAGE" });
    expect(store.sources.size).toBe(0);
  });
  it("does not call the provider after its duration budget is consumed", async () => {
    const store = new MemorySyncStore(), source = provider([[{ id: "A" }]]);
    let reads = 0;
    const result = await runCatalogSync({ store, provider: source, jobId: "visitjeju-ko", runId: "one", limits: { maxDurationMs: 1 }, now: () => stamp + (reads++ ? 2 : 0) });
    expect(result.status).toBe("paused"); expect(source.fetchPage).not.toHaveBeenCalled();
  });
});

describe("source hashing", () => {
  it("ignores object key order but detects actual source changes", () => {
    expect(sourceHash({ b: 2, a: 1 })).toBe(sourceHash({ a: 1, b: 2 }));
    expect(sourceHash({ a: 2 })).not.toBe(sourceHash({ a: 1 }));
  });
  it("rejects cyclic and non-JSON source data", () => {
    const loop: Record<string, unknown> = {}; loop.self = loop;
    expect(() => sourceHash(loop)).toThrow(); expect(() => sourceHash({ n: Infinity })).toThrow();
  });
});
