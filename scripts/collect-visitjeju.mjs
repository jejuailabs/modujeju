#!/usr/bin/env node
// Local preparation only. Running with no arguments (or --check) never fetches.
// --collect requires approval for this bounded run; flags are not approval itself.
import { existsSync, lstatSync, mkdirSync, openSync, closeSync, readFileSync, writeFileSync, linkSync, unlinkSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://api.visitjeju.net/vsjApi/contents/searchList";
const LOCK_NAME = "visitjeju-ko-collection.lock";
const MAX_RESPONSE_BYTES = 2_000_000;
const ENV_NAMES = [
  "VISITJEJU_API_ENABLED", "VISITJEJU_USAGE_APPROVED", "VISITJEJU_STORAGE_APPROVED",
  "VISITJEJU_API_KEY", "VISITJEJU_LOCAL_APPROVAL_EXPIRES_AT", "VISITJEJU_LOCAL_MAX_PAGES", "VISITJEJU_LOCAL_START_PAGE",
];

class CollectionError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = (code) => { throw new CollectionError(code); };
function pageRange(environment) {
  const start = environment.VISITJEJU_LOCAL_START_PAGE ?? "1";
  const budget = environment.VISITJEJU_LOCAL_MAX_PAGES ?? "";
  const startValid = /^(?:[1-9]\d{0,3}|10000)$/.test(start);
  const budgetValid = /^(?:[1-9]\d?|100)$/.test(budget);
  const startPage = startValid ? Number(start) : 1;
  const maxPages = budgetValid ? Number(budget) : 1;
  const endPage = startPage + maxPages - 1;
  return { startPage, maxPages, endPage, startValid: startValid && endPage <= 10_000, budgetValid };
}
function snapshotName(environment) {
  const { startPage, endPage } = pageRange(environment);
  return `visitjeju-ko-pages-${startPage}-${endPage}.json`;
}
const outputPath = (root, environment) => join(root, "research_notes", "ingestion", snapshotName(environment));
const lockPath = (root) => join(root, "research_notes", "ingestion", LOCK_NAME);

/** Parse a private file into an isolated object; never change process.env or files. */
export function readConfiguration(root = PROJECT_ROOT, environment = process.env) {
  let local = {};
  try {
    const path = join(root, ".env.local");
    if (existsSync(path)) local = parseEnv(readFileSync(path, "utf8"));
  } catch { fail("LOCAL_CONFIGURATION_UNREADABLE"); }
  return Object.fromEntries(ENV_NAMES.map(name => [name, environment[name] ?? local[name]]));
}

export function getLocalReadiness(environment, now = Date.now(), root = PROJECT_ROOT) {
  const expiry = environment.VISITJEJU_LOCAL_APPROVAL_EXPIRES_AT ?? "";
  const expiryTime = Date.parse(expiry);
  const expectedIso = expiry.includes(".") ? expiry : expiry.replace("Z", ".000Z");
  const range = pageRange(environment);
  const flags = {
    apiEnabled: environment.VISITJEJU_API_ENABLED === "true",
    usageApproved: environment.VISITJEJU_USAGE_APPROVED === "true",
    storageApproved: environment.VISITJEJU_STORAGE_APPROVED === "true",
    hasApiKey: typeof environment.VISITJEJU_API_KEY === "string" && environment.VISITJEJU_API_KEY.trim().length > 0,
    approvalUnexpired: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(expiry)
      && Number.isFinite(expiryTime) && Number.isFinite(now) && expiryTime > now
      && new Date(expiryTime).toISOString() === expectedIso,
    budgetValid: range.budgetValid,
    startPageValid: range.startValid,
    snapshotAbsent: !existsSync(outputPath(root, environment)),
    collectionIdle: !existsSync(lockPath(root)),
  };
  const codes = {
    apiEnabled: "API_DISABLED", usageApproved: "USAGE_NOT_APPROVED", storageApproved: "STORAGE_NOT_APPROVED",
    hasApiKey: "API_KEY_MISSING", approvalUnexpired: "LOCAL_APPROVAL_EXPIRED_OR_MISSING",
    budgetValid: "LOCAL_REQUEST_BUDGET_INVALID", startPageValid: "LOCAL_START_PAGE_INVALID",
    snapshotAbsent: "SNAPSHOT_ALREADY_EXISTS", collectionIdle: "COLLECTION_ALREADY_STARTED",
  };
  const reasons = Object.keys(flags).filter(key => !flags[key]).map(key => codes[key]);
  return { ready: reasons.length === 0, ...flags, reasons };
}

function count(value, maximum) {
  const number = typeof value === "number" ? value : typeof value === "string" && /^\d{1,9}$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < 0 || number > maximum) fail("INVALID_PROVIDER_RESPONSE");
  return number;
}

function validateEnvelope(payload, page) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || !["00", "200"].includes(String(payload.result)) || String(payload.resultMessage).toLowerCase() !== "success"
    || !Array.isArray(payload.items) || payload.items.length > 1000) fail("INVALID_PROVIDER_RESPONSE");
  const currentPage = count(payload.currentPage, 10_000);
  const pageCount = count(payload.pageCount, 10_000);
  const totalCount = count(payload.totalCount, 10_000_000);
  const resultCount = count(payload.resultCount, 1000);
  const pageSize = count(payload.pageSize, 1000);
  if (currentPage !== page || pageSize < 1 || resultCount !== payload.items.length || resultCount > pageSize
    || totalCount < resultCount || (totalCount === 0 && (resultCount !== 0 || pageCount > 1))
    || (totalCount > 0 && (pageCount < 1 || pageCount !== Math.ceil(totalCount / pageSize)
      || currentPage > pageCount || resultCount !== Math.min(pageSize, totalCount - (currentPage - 1) * pageSize)))) {
    fail("INVALID_PROVIDER_RESPONSE");
  }
  return { currentPage, pageCount, totalCount, resultCount, pageSize, items: payload.items };
}

// Keep documented data fields, never the request URL, key, unknown metadata or headers.
function snapshotItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)
    || typeof item.contentsid !== "string" || !/^[A-Z0-9_]{1,95}$/.test(item.contentsid)
    || typeof item.title !== "string" || !item.title.trim()) fail("INVALID_PROVIDER_RECORD");
  const result = { contentsid: item.contentsid };
  for (const name of ["title", "address", "roadaddress", "introduction", "alltag", "tag", "phoneno"])
    if (typeof item[name] === "string") result[name] = item[name];
  for (const name of ["latitude", "longitude"])
    if (item[name] === null || typeof item[name] === "number" || typeof item[name] === "string") result[name] = item[name];
  for (const name of ["contentscd", "region1cd", "region2cd"]) {
    if (item[name] && typeof item[name] === "object" && !Array.isArray(item[name]))
      result[name] = Object.fromEntries(["value", "label", "refId"].filter(key => typeof item[name][key] === "string").map(key => [key, item[name][key]]));
  }
  const photo = item.repPhoto?.photoid;
  if (photo && typeof photo === "object" && !Array.isArray(photo)) {
    const kept = {};
    for (const name of ["imgpath", "thumbnailpath"]) {
      if (typeof photo[name] !== "string") continue;
      try {
        const url = new URL(photo[name]);
        if (url.protocol === "https:" && !url.username && !url.password && !url.port && !url.search && !url.hash
          && ["api.cdn.visitjeju.net", "api.visitjeju.net"].includes(url.hostname)) kept[name] = url.toString();
      } catch { /* Malformed photo candidates are omitted. */ }
    }
    if (Object.keys(kept).length) result.repPhoto = { photoid: kept };
  }
  return result;
}

async function fetchPage(page, key, fetchImpl) {
  const url = new URL(ENDPOINT);
  // Match the guide's working URI example. The provider distinguishes this casing.
  url.searchParams.set("apiKey", key);
  url.searchParams.set("locale", "kr");
  url.searchParams.set("page", String(page));
  try {
    const response = await fetchImpl(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    // HTML can be an intermediary/security page or an unexpected provider page.
    // Stop without retrying or trying another endpoint; do not expose its body.
    if (["text/html", "application/xhtml+xml"].includes(contentType)) fail("PROVIDER_HTML_OR_FIREWALL_BLOCKED");
    if (!response.ok || response.redirected) fail("PROVIDER_UNAVAILABLE");
    const reader = response.body?.getReader();
    if (!reader) fail("INVALID_PROVIDER_RESPONSE");
    let body = "", size = 0;
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); fail("PROVIDER_RESPONSE_TOO_LARGE"); }
        body += decoder.decode(part.value, { stream: true });
      }
      body += decoder.decode();
    } finally { reader.releaseLock(); }
    const payload = JSON.parse(body);
    // Fail closed if a provider echoes credentials anywhere in its response.
    if (JSON.stringify(payload).includes(key)) fail("PROVIDER_RESPONSE_CONTAINS_CREDENTIAL");
    return validateEnvelope(payload, page);
  } catch (error) {
    if (error instanceof CollectionError) throw error;
    fail("PROVIDER_UNAVAILABLE");
  }
}

function prepareDirectory(root) {
  const canonicalRoot = realpathSync(root);
  let directory = canonicalRoot;
  for (const segment of ["research_notes", "ingestion"]) {
    directory = join(directory, segment);
    if (!existsSync(directory)) mkdirSync(directory);
    const stat = lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory() || realpathSync(directory) !== directory) fail("UNSAFE_OUTPUT_DIRECTORY");
  }
  return directory;
}

/** Explicit bounded page range (1–100 requests), no retries, Firebase or publishing. */
export async function collectSnapshot({ environment, root = PROJECT_ROOT, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const configuration = environment ?? readConfiguration(root);
  const readiness = getLocalReadiness(configuration, now(), root);
  if (!readiness.ready) fail(readiness.reasons[0]);
  const { startPage, endPage } = pageRange(configuration);
  const key = configuration.VISITJEJU_API_KEY.trim();
  let lock, temporary, destination, temporaryCreated = false;
  try {
    const directory = prepareDirectory(root);
    destination = join(directory, snapshotName(configuration));
    lock = join(directory, LOCK_NAME);
    const descriptor = openSync(lock, "wx", 0o600);
    closeSync(descriptor);
    // Ownership of the lock is recorded only after exclusive creation succeeds.
  } catch (error) {
    if (error instanceof CollectionError) throw error;
    fail(error?.code === "EEXIST" ? "COLLECTION_ALREADY_STARTED" : "LOCAL_OUTPUT_UNAVAILABLE");
  }
  try {
    if (existsSync(destination)) fail("SNAPSHOT_ALREADY_EXISTS");
    const pages = [], items = [], seen = new Set();
    let metadata;
    for (let page = startPage; page <= endPage; page++) {
      const gates = getLocalReadiness(configuration, now(), root);
      const blocker = gates.reasons.find(reason => reason !== "COLLECTION_ALREADY_STARTED");
      if (blocker) fail(blocker);
      const response = await fetchPage(page, key, fetchImpl);
      if (metadata && (metadata.totalCount !== response.totalCount || metadata.pageCount !== response.pageCount || metadata.pageSize !== response.pageSize)) fail("PROVIDER_PAGINATION_CHANGED");
      metadata = response;
      for (const raw of response.items) {
        const item = snapshotItem(raw);
        if (seen.has(item.contentsid)) fail("PROVIDER_DUPLICATE_RECORD");
        seen.add(item.contentsid);
        items.push(item);
      }
      pages.push(page);
      if (page >= response.pageCount) break;
    }
    const lastPage = pages.at(-1);
    const complete = lastPage >= metadata.pageCount;
    const snapshot = {
      schemaVersion: 1, sourceName: "VisitJeju", locale: "kr", retrievedAt: new Date(now()).toISOString(),
      reviewStatus: "unreviewed", pagesCollected: pages, totalCount: metadata.totalCount, pageCount: metadata.pageCount,
      startPage, requestedEndPage: endPage, complete, coversFullCatalog: startPage === 1 && complete,
      nextPage: complete ? null : lastPage + 1,
      notes: ["Companion conditions, prices, translations and image reuse rights require separate review.", "This snapshot is not imported into the public catalog."],
      items,
    };
    temporary = `${destination}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    temporaryCreated = true;
    // Atomic publication with an exclusive destination: never replace another snapshot.
    linkSync(temporary, destination);
    return {
      saved: true, complete, pagesCollected: pages.length, itemsCollected: items.length,
      startPage, endPage: lastPage, nextPage: snapshot.nextPage, pageCount: metadata.pageCount, totalCount: metadata.totalCount,
      snapshotFile: snapshotName(configuration),
    };
  } catch (error) {
    if (error instanceof CollectionError) throw error;
    fail(error?.code === "EEXIST" ? "SNAPSHOT_ALREADY_EXISTS" : "LOCAL_OUTPUT_UNAVAILABLE");
  } finally {
    if (temporaryCreated && existsSync(temporary)) unlinkSync(temporary);
    if (lock && existsSync(lock)) unlinkSync(lock);
  }
}

export async function main(args = process.argv.slice(2)) {
  try {
    if (args.length > 1 || (args.length === 1 && !["--check", "--collect"].includes(args[0]))) fail("USAGE_CHECK_OR_COLLECT_ONLY");
    const environment = readConfiguration();
    const result = args[0] === "--collect" ? await collectSnapshot({ environment }) : getLocalReadiness(environment);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    console.error(JSON.stringify({ saved: false, reason: error instanceof CollectionError ? error.code : "LOCAL_COLLECTION_FAILED" }));
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) process.exitCode = await main();
