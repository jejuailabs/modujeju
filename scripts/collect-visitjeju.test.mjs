import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { collectSnapshot, getLocalReadiness, readConfiguration } from "./collect-visitjeju.mjs";

const NOW = Date.parse("2026-11-08T03:00:00Z");
const KEY = "test-only-not-a-real-api-key";
let root;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "jeju-collector-test-")); });
afterEach(() => {
  // Remove only the freshly created test directory under the system temp root.
  assert.ok(resolve(root).startsWith(`${resolve(tmpdir())}${sep}jeju-collector-test-`));
  rmSync(root, { recursive: true, force: true });
});
const output = (startPage = 1, maxPages = 2) => join(root, "research_notes", "ingestion", `visitjeju-ko-pages-${startPage}-${startPage + maxPages - 1}.json`);
function approved(overrides = {}) {
  return {
    VISITJEJU_API_ENABLED: "true", VISITJEJU_USAGE_APPROVED: "true", VISITJEJU_STORAGE_APPROVED: "true",
    VISITJEJU_API_KEY: KEY, VISITJEJU_LOCAL_APPROVAL_EXPIRES_AT: "2026-11-08T04:00:00Z", VISITJEJU_LOCAL_MAX_PAGES: "2",
    // The local collector must not require, initialize or enable cloud services.
    CLOUD_SERVICES_ENABLED: "false", ...overrides,
  };
}
function envelope(page = 1, totalCount = 5, pageSize = 2, overrides = {}) {
  const length = Math.max(0, Math.min(pageSize, totalCount - (page - 1) * pageSize));
  return {
    result: "200", resultMessage: "SUCCESS", currentPage: page,
    totalCount, pageSize, pageCount: Math.ceil(totalCount / pageSize), resultCount: length,
    items: Array.from({ length }, (_, i) => ({ contentsid: `CNTS_${(page - 1) * pageSize + i}`, title: `장소 ${i}`, latitude: 33.4, longitude: 126.5 })),
    ...overrides,
  };
}
const jsonResponse = (value) => new Response(JSON.stringify(value));
const run = (fetchImpl, environment = approved(), clock = () => NOW) => collectSnapshot({ environment, root, fetchImpl, now: clock });

test("readiness is read-only and includes only booleans and fixed reason codes", () => {
  const status = getLocalReadiness({}, NOW, root);
  assert.equal(status.ready, false);
  assert.ok(status.reasons.includes("API_KEY_MISSING"));
  assert.ok(Object.entries(status).every(([name, value]) => name === "reasons" || typeof value === "boolean"));
  assert.deepEqual(readdirSync(root), []);
  assert.equal(JSON.stringify(getLocalReadiness(approved(), NOW, root)).includes(KEY), false);
});

test("reads only its own settings, preserves process environment and honors explicit environment values", () => {
  writeFileSync(join(root, ".env.local"), `VISITJEJU_API_KEY="${KEY}"\nVISITJEJU_API_ENABLED=true\nFIREBASE_ADMIN_PRIVATE_KEY=private\n`);
  const before = process.env.VISITJEJU_API_KEY;
  const config = readConfiguration(root, { VISITJEJU_API_ENABLED: "false" });
  assert.equal(config.VISITJEJU_API_KEY, KEY);
  assert.equal(config.VISITJEJU_API_ENABLED, "false");
  assert.equal(config.FIREBASE_ADMIN_PRIVATE_KEY, undefined);
  assert.equal(process.env.VISITJEJU_API_KEY, before);
});

test("each missing gate, key, expiry or bounded request budget blocks every network request", async () => {
  const cases = [
    ["VISITJEJU_API_ENABLED", "false"], ["VISITJEJU_USAGE_APPROVED", "false"], ["VISITJEJU_STORAGE_APPROVED", "false"],
    ["VISITJEJU_API_KEY", " "], ["VISITJEJU_LOCAL_APPROVAL_EXPIRES_AT", ""],
    ["VISITJEJU_LOCAL_APPROVAL_EXPIRES_AT", "2026-11-08T03:00:00Z"],
    ["VISITJEJU_LOCAL_APPROVAL_EXPIRES_AT", "2027-02-30T04:00:00Z"],
    ["VISITJEJU_LOCAL_MAX_PAGES", undefined], ["VISITJEJU_LOCAL_MAX_PAGES", "0"],
    ["VISITJEJU_LOCAL_MAX_PAGES", "101"], ["VISITJEJU_LOCAL_MAX_PAGES", "1.0"],
    ["VISITJEJU_LOCAL_START_PAGE", "0"], ["VISITJEJU_LOCAL_START_PAGE", "10000"],
    ["VISITJEJU_LOCAL_START_PAGE", "1/../../outside"],
  ];
  let calls = 0;
  for (const [name, value] of cases) await assert.rejects(run(() => { calls++; }, approved({ [name]: value })));
  assert.equal(calls, 0);
  assert.deepEqual(readdirSync(root), []);
});

test("respects the requested page budget in a local review snapshot with cloud off", async () => {
  const calls = [];
  const result = await run(async (url, options) => {
    calls.push(Number(url.searchParams.get("page")));
    assert.equal(url.origin + url.pathname, "https://api.visitjeju.net/vsjApi/contents/searchList");
    assert.deepEqual(url.searchParams.getAll("apiKey"), [KEY]);
    assert.equal(url.searchParams.has("apikey"), false);
    assert.equal(url.searchParams.get("locale"), "kr");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    return jsonResponse(envelope(calls.length));
  });
  assert.deepEqual(calls, [1, 2]);
  assert.deepEqual(result, {
    saved: true, complete: false, pagesCollected: 2, itemsCollected: 4,
    startPage: 1, endPage: 2, nextPage: 3, pageCount: 3, totalCount: 5, snapshotFile: "visitjeju-ko-pages-1-2.json",
  });
  const serialized = readFileSync(output(), "utf8");
  const snapshot = JSON.parse(serialized);
  assert.equal(snapshot.reviewStatus, "unreviewed");
  assert.equal(snapshot.nextPage, 3);
  assert.equal(snapshot.totalCount, 5);
  assert.equal(serialized.includes(KEY), false);
  assert.equal(/apikey/i.test(serialized), false);
  assert.deepEqual(readdirSync(join(root, "research_notes", "ingestion")), ["visitjeju-ko-pages-1-2.json"]);
});

test("respects a one-request budget and stops early when the provider is complete", async () => {
  let calls = 0;
  const result = await run(async () => { calls++; return jsonResponse(envelope(1, 1)); }, approved({ VISITJEJU_LOCAL_MAX_PAGES: "1" }));
  assert.equal(calls, 1);
  assert.equal(result.complete, true);
  assert.equal(JSON.parse(readFileSync(output(1, 1), "utf8")).nextPage, null);
});

test("continues from an approved later page without overwriting previous range snapshots", async () => {
  await run(async url => jsonResponse(envelope(Number(url.searchParams.get("page")), 11)));
  const firstSnapshot = readFileSync(output(), "utf8");
  const calls = [];
  const result = await run(async url => {
    const page = Number(url.searchParams.get("page"));
    calls.push(page);
    return jsonResponse(envelope(page, 11));
  }, approved({ VISITJEJU_LOCAL_START_PAGE: "3", VISITJEJU_LOCAL_MAX_PAGES: "100" }));
  assert.deepEqual(calls, [3, 4, 5, 6]);
  assert.equal(result.complete, true);
  assert.equal(result.nextPage, null);
  assert.equal(result.itemsCollected, 7);
  const continued = JSON.parse(readFileSync(output(3, 100), "utf8"));
  assert.equal(continued.startPage, 3);
  assert.equal(continued.coversFullCatalog, false);
  assert.equal(readFileSync(output(), "utf8"), firstSnapshot);
});

test("supports larger requested batches while keeping the explicit budget", async () => {
  const calls = [];
  const result = await run(async url => {
    const page = Number(url.searchParams.get("page"));
    calls.push(page);
    return jsonResponse(envelope(page, 40));
  }, approved({ VISITJEJU_LOCAL_START_PAGE: "5", VISITJEJU_LOCAL_MAX_PAGES: "7" }));
  assert.deepEqual(calls, [5, 6, 7, 8, 9, 10, 11]);
  assert.equal(result.complete, false);
  assert.equal(result.nextPage, 12);
  assert.equal(result.pagesCollected, 7);
  assert.equal(result.snapshotFile, "visitjeju-ko-pages-5-11.json");
});

test("existing snapshots prevent a second network call and are never overwritten", async () => {
  mkdirSync(join(root, "research_notes", "ingestion"), { recursive: true });
  writeFileSync(output(), "existing");
  let calls = 0;
  await assert.rejects(run(() => { calls++; }), { message: "SNAPSHOT_ALREADY_EXISTS" });
  assert.equal(calls, 0);
  assert.equal(readFileSync(output(), "utf8"), "existing");
});

test("concurrent collectors are blocked by the exclusive lock", async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const first = run(async () => { calls++; await pending; return jsonResponse(envelope(1, 1)); });
  await assert.rejects(run(() => { calls++; }), { message: "COLLECTION_ALREADY_STARTED" });
  release();
  await first;
  assert.equal(calls, 1);
});

test("expiry is rechecked before page two; failed runs leave no partial snapshot", async () => {
  let time = NOW, calls = 0;
  await assert.rejects(run(async () => {
    calls++;
    time = Date.parse("2026-11-08T04:00:00Z");
    return jsonResponse(envelope());
  }, approved(), () => time), { message: "LOCAL_APPROVAL_EXPIRED_OR_MISSING" });
  assert.equal(calls, 1);
  assert.equal(existsSync(output()), false);
  assert.deepEqual(readdirSync(join(root, "research_notes", "ingestion")), []);
});

test("provider failures are redacted, never retried, and never create a snapshot", async () => {
  let calls = 0;
  await assert.rejects(run(async () => {
    calls++;
    throw new Error(`Request failed https://api.visitjeju.net/?apiKey=${KEY}`);
  }), error => {
    assert.equal(error.message, "PROVIDER_UNAVAILABLE");
    assert.equal(String(error).includes(KEY), false);
    return true;
  });
  assert.equal(calls, 1);
  assert.equal(existsSync(output()), false);
});

test("refuses oversized streamed responses", async () => {
  await assert.rejects(run(async () => new Response("x".repeat(2_000_001))), { message: "PROVIDER_RESPONSE_TOO_LARGE" });
  assert.equal(existsSync(output()), false);
});

test("stops on HTML provider or firewall pages without exposing their contents or retrying", async () => {
  let calls = 0;
  await assert.rejects(run(async () => {
    calls++;
    return new Response(`<html>Blocked request: ${KEY}</html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }), error => {
    assert.equal(error.message, "PROVIDER_HTML_OR_FIREWALL_BLOCKED");
    assert.equal(String(error).includes(KEY), false);
    return true;
  });
  assert.equal(calls, 1);
  assert.equal(existsSync(output()), false);
});

test("rejects malformed pagination and provider errors before saving", async () => {
  for (const overrides of [{ result: "500" }, { currentPage: null }, { pageCount: 0 }, { resultCount: 1 }, { pageSize: true }]) {
    await assert.rejects(run(async () => jsonResponse(envelope(1, 5, 2, overrides))), { message: "INVALID_PROVIDER_RESPONSE" });
    assert.equal(existsSync(output()), false);
  }
});

test("accepts the guide's 100-item page size and the partial last page", async () => {
  // The response specification illustrates 1,152 records in twelve 100-item pages.
  for (const [page, expectedRows] of [[1, 100], [12, 52]]) {
    const payload = envelope(page, 1152, 100);
    for (const field of ["totalCount", "resultCount", "pageSize", "pageCount", "currentPage"]) payload[field] = String(payload[field]);
    const result = await run(async () => jsonResponse(payload), approved({
      VISITJEJU_LOCAL_START_PAGE: String(page), VISITJEJU_LOCAL_MAX_PAGES: "1",
    }));
    assert.equal(result.itemsCollected, expectedRows);
    assert.equal(result.nextPage, page === 12 ? null : 2);
  }
});

test("rejects changed pagination and duplicate IDs between pages", async () => {
  await assert.rejects(run(async url => jsonResponse(envelope(Number(url.searchParams.get("page")), url.searchParams.get("page") === "1" ? 5 : 6))), { message: "PROVIDER_PAGINATION_CHANGED" });
  await assert.rejects(run(async url => {
    const payload = envelope(Number(url.searchParams.get("page")));
    payload.items[0].contentsid = "CNTS_DUPLICATE";
    return jsonResponse(payload);
  }), { message: "PROVIDER_DUPLICATE_RECORD" });
  assert.equal(existsSync(output()), false);
});

test("does not persist unexpected metadata or untrusted photo URLs", async () => {
  const payload = envelope(1, 1);
  payload.requestUrl = "secret-request-url";
  payload.items[0].apiKey = "unwanted-metadata";
  payload.items[0].repPhoto = { photoid: { imgpath: "https://evil.example/photo.jpg", thumbnailpath: "https://api.cdn.visitjeju.net/photomng/test.jpg" } };
  await run(async () => jsonResponse(payload));
  const serialized = readFileSync(output(), "utf8");
  assert.equal(serialized.includes("unwanted-metadata"), false);
  assert.equal(serialized.includes("secret-request-url"), false);
  assert.equal(serialized.includes("evil.example"), false);
  assert.ok(serialized.includes("https://api.cdn.visitjeju.net/photomng/test.jpg"));
});

test("rejects credential echoes rather than writing them", async () => {
  const payload = envelope(1, 1);
  payload.items[0].introduction = `echo: ${KEY}`;
  await assert.rejects(run(async () => jsonResponse(payload)), { message: "PROVIDER_RESPONSE_CONTAINS_CREDENTIAL" });
  assert.equal(existsSync(output()), false);
});
