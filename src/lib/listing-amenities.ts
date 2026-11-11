import { z } from "zod";
import { amenitiesSchema, placeSchema } from "./server/place-schema";
import type { Place } from "./types";

/**
 * Facility facts read from another travel app's public place page (for
 * example 맘맘), matched to a VisitJeju listing. Only facility values, the
 * page link, its update date and a short excerpt are kept.
 */
export const listingAmenityRecordSchema = z.object({
  sourceId: z.string().regex(/^[a-zA-Z0-9_-]{1,95}$/),
  listingName: z.string().min(1).max(120),
  amenities: amenitiesSchema.refine(
    (amenities) => Object.values(amenities).every(entry => entry?.source === "listing"),
    "Listing records may only carry listing evidence",
  ),
}).strict();

export const listingAmenitiesFileSchema = z.object({
  sourceName: z.string().min(1).max(40),
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(300).optional(),
  records: z.array(listingAmenityRecordSchema),
}).strict();

/**
 * Fill facilities that no other source has filled yet. Official, phone,
 * on-site and search evidence always win; a listing never replaces them and
 * never touches admission facts.
 */
export function applyListingAmenities(places: readonly Place[], input: unknown): Place[] {
  const file = listingAmenitiesFileSchema.parse(input);
  const byId = new Map(file.records.map(record => [record.sourceId, record]));
  if (byId.size !== file.records.length) throw new Error("DUPLICATE_LISTING_AMENITIES");
  const placeIds = new Set(places.map(place => place.sourceId));
  for (const record of file.records) {
    if (!placeIds.has(record.sourceId)) throw new Error("LISTING_AMENITIES_SOURCE_NOT_FOUND");
  }
  return places.map(place => {
    const record = place.sourceId ? byId.get(place.sourceId) : undefined;
    if (!record) return place;
    const amenities = { ...place.amenities };
    for (const [key, evidence] of Object.entries(record.amenities)) {
      const current = amenities[key as keyof typeof amenities];
      if (!evidence || (current && current.value !== "unknown" && current.source !== "listing")) continue;
      Object.assign(amenities, { [key]: evidence });
    }
    const result: Place = { ...place, amenities };
    placeSchema.parse(result);
    return result;
  });
}
