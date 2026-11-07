import { createHash } from "node:crypto";
import { SyncError } from "./state";

/** Hash source JSON only; retrieval timestamps created by our app are excluded. */
export function sourceHash(value: unknown): string {
  const seen = new WeakSet<object>();
  let nodes = 0;
  function canonical(input: unknown, depth: number): unknown {
    if (++nodes > 100_000 || depth > 50) throw new SyncError("SYNC_INVALID_RECORD");
    if (input === null || typeof input === "string" || typeof input === "boolean") return input;
    if (typeof input === "number" && Number.isFinite(input)) return input;
    if (!input || typeof input !== "object" || seen.has(input)) throw new SyncError("SYNC_INVALID_RECORD");
    if (!Array.isArray(input) && Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) throw new SyncError("SYNC_INVALID_RECORD");
    seen.add(input);
    const result = Array.isArray(input) ? input.map((entry) => canonical(entry, depth + 1)) : Object.fromEntries(Object.entries(input).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, entry]) => [key, canonical(entry, depth + 1)]));
    seen.delete(input);
    return result;
  }
  const json = JSON.stringify(canonical(value, 0));
  if (Buffer.byteLength(json, "utf8") > 2_000_000) throw new SyncError("SYNC_INVALID_RECORD");
  return createHash("sha256").update(json).digest("hex");
}
