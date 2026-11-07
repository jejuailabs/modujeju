import { createUnknownFacts } from "@/lib/types";
import type { Place } from "@/lib/types";
import { placeSchema } from "@/lib/server/place-schema";
import { safePhotoUrl } from "@/lib/visitjeju/normalize";
import { SyncError } from "./state";
import type { SyncCandidate } from "./types";

export type StoredDocument = Record<string, unknown>;
export interface SourceRecord {
  sourceId: string; sourceHash: string; placeId: string;
  firstSeenAt: string; lastSeenAt: string; lastSeenScanId: string;
  changedAt: string; revision: number;
  snapshot: StoredDocument; candidatePhotoUrl: string | null; reviewWarnings: string[];
  eligible: true; place: Place;
  editorialReviewRequired: boolean; changedEditorialFields: string[];
}
const basicKeys = ["name", "summary", "address", "district", "region", "type", "lat", "lng", "sourceId", "sourceUrl", "sourceName", "sourceTags", "sourceObservations", "sourceUpdatedAt", "basicSourceCheckedAt", "retrievedAt"] as const;

/** Only basic source fields change; manually reviewed policy/price/photo/status survive. */
export function prepareUpsert(existing: StoredDocument | null, previousSource: SourceRecord | null, candidate: SyncCandidate, at: string, scanId: string) {
  const parsed = placeSchema.safeParse(candidate.draft.place);
  if (!parsed.success || parsed.data.dataMode !== "live" || parsed.data.sourceId !== candidate.sourceId || !/^[a-zA-Z0-9_-]{1,95}$/.test(candidate.sourceId) || !/^[a-f0-9]{64}$/.test(candidate.sourceHash)) throw new SyncError("SYNC_INVALID_RECORD");
  const place = parsed.data;
  if (existing && existing.sourceId !== candidate.sourceId) throw new SyncError("SYNC_INVALID_RECORD");
  const changed = !previousSource || previousSource.sourceHash !== candidate.sourceHash;
  const snapshot = Object.fromEntries(basicKeys.filter((key) => place[key] !== undefined).map((key) => [key, place[key]]));
  const unreviewedPlace: Place = { ...place, ...(existing ? { id: String(existing.id), slug: String(existing.slug) } : {}), facts: createUnknownFacts(), price: { amount: null, unit: place.price.unit, petExtra: null }, durationMinutes: null, image: "/assets/icons/map-pin.svg", imageKind: "placeholder", verifiedAt: null };
  const reviewedLocationFields = ["address", "region", "type", "lat", "lng"] as const;
  const changedEditorialFields = existing?.status === "published" ? reviewedLocationFields.filter((key) => JSON.stringify(existing[key]) !== JSON.stringify(place[key])) : [];
  const source: SourceRecord = {
    sourceId: candidate.sourceId, sourceHash: candidate.sourceHash, placeId: existing ? String(existing.id) : place.id,
    firstSeenAt: previousSource?.firstSeenAt ?? at, lastSeenAt: at, lastSeenScanId: scanId,
    changedAt: changed ? at : previousSource.changedAt, revision: (previousSource?.revision ?? 0) + (changed ? 1 : 0), snapshot,
    candidatePhotoUrl: safePhotoUrl(candidate.draft.candidatePhotoUrl),
    reviewWarnings: (candidate.draft.reviewWarnings ?? []).filter((code) => /^[A-Z0-9_]{1,80}$/.test(code)).slice(0, 30),
    eligible: true, place: unreviewedPlace,
    editorialReviewRequired: changedEditorialFields.length > 0, changedEditorialFields,
  };
  if (!existing) {
    // Source providers never get authority to publish, verify or grant image rights.
    const document: StoredDocument = { ...unreviewedPlace, status: "draft", imageRights: { status: "placeholder", credit: "", license: "" }, createdAt: at, updatedAt: at, createdBy: "visitjeju-sync", updatedBy: "visitjeju-sync" };
    return { document, source, outcome: "created" as const, publicChanged: true };
  }
  if (!changed) return { document: null, source, outcome: "unchanged" as const, publicChanged: false };
  const document: StoredDocument = { ...existing, ...snapshot, updatedAt: at, updatedBy: "visitjeju-sync" };
  if (existing.status === "published") {
    // Reviewed classification/coordinates can contain intentional local exceptions.
    for (const key of reviewedLocationFields) document[key] = existing[key];
    if (changedEditorialFields.length) {
      document.sourceReviewRequired = true;
      document.sourceChangedFields = changedEditorialFields;
    }
  }
  return { document, source, outcome: "updated" as const, publicChanged: true };
}
