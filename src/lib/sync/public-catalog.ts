import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminServices } from "@/lib/firebase/admin";
import { toPublicPlace } from "@/lib/server/place-schema";
import { ServiceError } from "@/lib/server/errors";
import { createUnknownFacts, type Place } from "@/lib/types";

type Document = Record<string, unknown>;
function key(place: { sourceId?: unknown; id?: unknown }): string {
  return typeof place.sourceId === "string" && place.sourceId ? `source:${place.sourceId}` : `place:${String(place.id)}`;
}

/** Source observations are usable before editorial verification; hidden overlays win. */
export function mergeSourcedCatalog(sources: readonly Document[], overlays: readonly Document[]): Place[] {
  const result = new Map<string, Place>();
  for (const source of sources) {
    if (source.eligible !== true) continue;
    const place = toPublicPlace(source.place);
    if (!place || place.dataMode !== "live") throw new ServiceError("INVALID_SOURCE_CATALOG", 503);
    result.set(key(place), { ...place, facts: createUnknownFacts(), price: { amount: null, unit: place.price.unit, petExtra: null }, durationMinutes: null, verifiedAt: null, image: "/assets/icons/map-pin.svg", imageKind: "placeholder" });
  }
  const sourceKeyById = new Map([...result].map(([sourceKey, place]) => [place.id, sourceKey]));
  const overlayKey = (entry: { sourceId?: unknown; id?: unknown }) => result.has(key(entry)) ? key(entry) : sourceKeyById.get(String(entry.id)) ?? key(entry);
  const blocked = new Set(overlays.filter((entry) => ["hidden", "suspended", "closed"].includes(String(entry.status))).map(overlayKey));
  for (const overlay of overlays) {
    if (overlay.status !== "published") continue;
    const place = toPublicPlace(overlay);
    if (!place || place.dataMode !== "live") throw new ServiceError("INVALID_PUBLISHED_DATA", 503);
    if (place.facts.operating.value === "closed" || place.facts.operating.value === "suspended") blocked.add(overlayKey(place));
    else result.set(overlayKey(place), place);
  }
  for (const excluded of blocked) result.delete(excluded);
  return [...result.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function readCollection(db: Firestore, name: string): Promise<Document[]> {
  const records: Document[] = [];
  let page = await db.collection(name).orderBy("__name__").limit(500).get();
  for (;;) {
    records.push(...page.docs.map((doc) => doc.data()));
    if (records.length > 10_000) throw new ServiceError("CATALOG_SIZE_LIMIT", 503);
    if (page.size < 500) return records;
    page = await db.collection(name).orderBy("__name__").startAfter(page.docs[page.docs.length - 1]).limit(500).get();
  }
}

/** Only Firebase cloud access is needed to read the last successful source data. */
export async function readFirestoreSyncCatalog(): Promise<Place[]> {
  try {
    const { db } = getAdminServices();
    const [sources, overlays] = await Promise.all([readCollection(db, "sourcePlaces"), readCollection(db, "places")]);
    return mergeSourcedCatalog(sources, overlays);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("CATALOG_UNAVAILABLE", 503);
  }
}
