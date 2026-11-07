import { z } from "zod";
import type { Place } from "./types";

const coordinateRecord = z.object({
  sourceId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number().min(33.05).max(33.62),
  lng: z.number().min(126.08).max(126.99),
  coordinateSource: z.object({
    sourceName: z.literal("Wikidata (CC0)"),
    sourceUrl: z.string().regex(/^https:\/\/www\.wikidata\.org\/wiki\/Q[1-9]\d*$/),
    checkedAt: z.iso.date(),
    kind: z.literal("place-center"),
  }).strict(),
  matchEvidence: z.string().min(1),
}).strict();

/** Apply reviewed, cached positions only to the exact catalog identity reviewed. */
export function applyCatalogCoordinates(places: Place[], records: readonly unknown[]): Place[] {
  const parsed = records.map((record) => coordinateRecord.parse(record));
  if (new Set(parsed.map((record) => record.sourceId)).size !== parsed.length) {
    throw new Error("DUPLICATE_COORDINATE_SOURCE_ID");
  }
  const positions = new Map(parsed.map((record) => [record.sourceId, record]));
  return places.map((place) => {
    const position = positions.get(place.sourceId ?? "");
    if (!position) return place;
    if (place.name.ko !== position.name || place.address.ko !== position.address) {
      throw new Error("COORDINATE_IDENTITY_MISMATCH");
    }
    return { ...place, lat: position.lat, lng: position.lng, coordinateSource: position.coordinateSource };
  });
}
