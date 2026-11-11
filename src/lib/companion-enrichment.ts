import { z } from "zod";
import { admissionFacts, admissionsSchema } from "./official-catalog";
import { amenitiesSchema, placeSchema } from "./server/place-schema";
import { createUnknownFacts, type Place, type PlaceFacts } from "./types";

const observationsSchema = placeSchema.shape.sourceObservations.unwrap();
const factKeys = Object.keys(createUnknownFacts()) as [keyof PlaceFacts, ...(keyof PlaceFacts)[]];

export const companionEnrichmentSchema = z.object({
  sourceId: z.string().regex(/^[a-zA-Z0-9_-]{1,95}$/),
  observations: observationsSchema,
  amenities: amenitiesSchema.optional(),
  admissions: admissionsSchema.optional(),
  removeObservationFields: z.array(z.string().min(1).max(80)).max(60).optional(),
  clearFactKeys: z.array(z.enum(factKeys)).max(factKeys.length).optional(),
}).strict();

/** Reviewed source-ID patches also survive a refresh of the basic API listing. */
export function applyCompanionEnrichment(places: readonly Place[], input: readonly unknown[], now = new Date()): Place[] {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
  const canReplace = (incoming: { verifiedAt: string | null }, existing?: { verifiedAt: string | null }) =>
    !!incoming.verifiedAt && incoming.verifiedAt <= today
    && (!existing?.verifiedAt || incoming.verifiedAt >= existing.verifiedAt);
  const patches = input.map(value => companionEnrichmentSchema.parse(value));
  const byId = new Map(patches.map(patch => [patch.sourceId, patch]));
  if (byId.size !== patches.length) throw new Error("DUPLICATE_COMPANION_ENRICHMENT");
  const placeIds = new Set(places.map(place => place.sourceId));
  for (const patch of patches) {
    if (!placeIds.has(patch.sourceId)) throw new Error("COMPANION_ENRICHMENT_SOURCE_NOT_FOUND");
  }
  return places.map(place => {
    const patch = place.sourceId ? byId.get(place.sourceId) : undefined;
    if (!patch) return place;
    const replacedFields = new Set([
      ...(patch.removeObservationFields ?? []),
      ...patch.observations.map(observation => observation.field),
    ]);
    const facts = { ...place.facts };
    const unknown = createUnknownFacts();
    for (const key of patch.clearFactKeys ?? []) {
      Object.assign(facts, { [key]: unknown[key] });
    }
    for (const [key, fact] of Object.entries(admissionFacts(patch.admissions))) {
      if (fact.source !== "unknown" && canReplace(fact, facts[key as keyof PlaceFacts])) Object.assign(facts, { [key]: fact });
    }
    const amenities = { ...place.amenities };
    for (const [key, evidence] of Object.entries(patch.amenities ?? {})) {
      if (canReplace(evidence, amenities[key as keyof typeof amenities])) Object.assign(amenities, { [key]: evidence });
    }
    const result: Place = {
      ...place,
      facts,
      sourceObservations: [
        ...(place.sourceObservations ?? []).filter(observation => !replacedFields.has(observation.field)),
        ...patch.observations,
      ],
      ...(Object.keys(amenities).length ? { amenities } : {}),
    };
    // Validate the complete merged record, including the public size limits.
    placeSchema.parse(result);
    return result;
  });
}
