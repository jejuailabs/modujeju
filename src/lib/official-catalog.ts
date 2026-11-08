import { z } from "zod";
import { createUnknownFacts, type Fact, type LocalizedText, type Place, type PlaceFacts, type PlaceType } from "./types";
import { plainText } from "./visitjeju/normalize";
import { amenitiesSchema } from "./server/place-schema";

const localizedInput = z.union([
  z.string(),
  z.object({ ko: z.string(), en: z.string(), zh: z.string(), ja: z.string() }).strict(),
]);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
});
const sourceUrl = z.string().url().refine((value) => {
  const parsed = new URL(value);
  return parsed.protocol === "https:" && !parsed.username && !parsed.password;
});

// Admission evidence found by research. It becomes a companion fact only after
// an operator stamps verifiedAt; until then it stays out of every verdict.
const admissionEvidence = {
  sourceUrl,
  verifiedAt: day.nullable(),
  quote: z.string().max(160).optional(),
  publishedAt: day.nullable().optional(),
};
const accessValue = z.enum(["yes", "conditional", "no"]);
export const admissionsSchema = z.object({
  kids: z.object({ value: accessValue, ...admissionEvidence }).strict().optional(),
  pet: z.object({
    value: z.enum(["indoor", "outdoor", "no"]),
    maxWeightKg: z.number().positive().max(200).nullable().optional(),
    weightInclusive: z.boolean().nullable().optional(),
    carrierRequired: z.boolean().nullable().optional(),
    ...admissionEvidence,
  }).strict().optional(),
  senior: z.object({ value: accessValue, ...admissionEvidence }).strict().optional(),
}).strict();

/** Input from manually observed official listings, not an API response. */
export const officialRecordSchema = z.object({
  name: localizedInput,
  address: localizedInput,
  summary: localizedInput.optional(),
  district: localizedInput.optional(),
  region: z.enum(["east", "west", "south", "north"]),
  type: z.enum(["restaurant", "cafe", "stay", "attraction", "experience", "walk"]),
  sourceUrl,
  sourceId: z.string().regex(/^[a-zA-Z0-9_-]{1,95}$/).optional(),
  sourceName: z.string().max(120).optional(),
  sourceTags: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional(),
  retrievedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  basicSourceCheckedAt: day.optional(),
  lat: z.number().min(32).max(35).nullable().optional(),
  lng: z.number().min(125).max(128).nullable().optional(),
  durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  // These remain research notes. A tag/quote does not prove current entry rules.
  observations: z.array(z.unknown()).optional(),
  // Operator-reviewed facilities (official listing, phone, onsite or approved search evidence).
  amenities: amenitiesSchema.optional(),
  admissions: admissionsSchema.optional(),
});
export type RawOfficialRecord = z.input<typeof officialRecordSchema>;

export const categoryPlaceholder: Record<PlaceType, string> = {
  restaurant: "/assets/icons/catalog-restaurant.svg",
  cafe: "/assets/icons/catalog-cafe.svg",
  stay: "/assets/icons/catalog-stay.svg",
  attraction: "/assets/icons/map-pin.svg",
  experience: "/assets/icons/map-pin.svg",
  walk: "/assets/icons/map-pin.svg",
};

function localized(value: z.infer<typeof localizedInput> | undefined, limit: number): LocalizedText {
  if (typeof value === "string" || value === undefined) {
    const original = plainText(value, limit);
    return { ko: original, en: original, zh: original, ja: original };
  }
  return { ko: plainText(value.ko, limit), en: plainText(value.en, limit), zh: plainText(value.zh, limit), ja: plainText(value.ja, limit) };
}

function tags(values: string[]): string[] {
  return [...new Set(values.map((value) => plainText(value, 80)).filter(Boolean))].slice(0, 40);
}

function stableUrlId(value: string): string {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

function sourceObservations(values: unknown[], fallbackUrl: string): NonNullable<Place["sourceObservations"]> {
  return values.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const observation = value as Record<string, unknown>;
    if (typeof observation.field !== "string" || typeof observation.value !== "string") return [];
    const field = plainText(observation.field, 80);
    const observedValue = plainText(observation.value, 1000);
    const url = sourceUrl.safeParse(observation.sourceUrl ?? fallbackUrl);
    // Preserve explicit missing/invalid evidence dates rather than borrowing the
    // basic listing's download date. Legacy reviewed observations are unchanged.
    const evidenceDay = day.nullable().safeParse(observation.verifiedAt);
    const verification = Object.hasOwn(observation, "verifiedAt")
      ? { verifiedAt: evidenceDay.success ? evidenceDay.data : null }
      : {};
    return field && observedValue && url.success ? [{ field, value: observedValue, sourceUrl: url.data, ...verification }] : [];
  }).slice(0, 60);
}

/** Approved admission evidence only; pending (undated) evidence leaves facts unknown. */
function admissionFacts(admissions: z.infer<typeof admissionsSchema> | undefined): PlaceFacts {
  const facts = createUnknownFacts();
  if (!admissions) return facts;
  const official = <T>(value: T, evidence: { sourceUrl: string; verifiedAt: string | null }): Fact<T> =>
    ({ value, source: "official", verifiedAt: evidence.verifiedAt, sourceUrl: evidence.sourceUrl });
  const { kids, pet, senior } = admissions;
  if (kids?.verifiedAt) facts.kidsEntry = official(kids.value, kids);
  if (senior?.verifiedAt) facts.stepFree = official(senior.value, senior);
  if (pet?.verifiedAt) {
    facts.petEntry = official(pet.value, pet);
    if (typeof pet.maxWeightKg === "number") facts.dogMaxWeight = official<number | null>(pet.maxWeightKg, pet);
    if (typeof pet.weightInclusive === "boolean") facts.dogWeightInclusive = official(pet.weightInclusive, pet);
    if (typeof pet.carrierRequired === "boolean") facts.carrierRequired = official(pet.carrierRequired, pet);
  }
  return facts;
}

export function mapOfficialRecord(raw: unknown): Place {
  const record = officialRecordSchema.parse(raw);
  const url = new URL(record.sourceUrl);
  const isVisitJeju = url.hostname === "visitjeju.net" || url.hostname.endsWith(".visitjeju.net");
  const observedId = record.sourceId ?? url.searchParams.get("contentsid") ?? undefined;
  if (observedId && !/^[a-zA-Z0-9_-]{1,95}$/.test(observedId)) throw new Error("INVALID_OFFICIAL_SOURCE_ID");
  const candidateId = observedId ? `${isVisitJeju ? "vj" : "official"}-${observedId}` : "";
  const id = candidateId && candidateId.length <= 100 ? candidateId : `official-${record.type}-${stableUrlId(record.sourceUrl)}`;
  const basicSourceCheckedAt = day.parse(record.basicSourceCheckedAt ?? record.retrievedAt.slice(0, 10));
  const name = localized(record.name, 120);
  const address = localized(record.address, 300);
  if (!name.ko || !address.ko) throw new Error("OFFICIAL_LISTING_INCOMPLETE");
  const coordinatesKnown = record.lat != null && record.lng != null;
  return {
    id,
    slug: id.toLowerCase().replace(/_/g, "-"),
    name,
    summary: localized(record.summary, 1200),
    address,
    district: localized(record.district, 80),
    region: record.region,
    type: record.type,
    lat: coordinatesKnown ? record.lat! : null,
    lng: coordinatesKnown ? record.lng! : null,
    image: categoryPlaceholder[record.type],
    imageKind: "placeholder",
    ...(record.tags ? { tags: tags(record.tags) } : {}),
    sourceTags: tags(record.sourceTags),
    sourceObservations: sourceObservations(record.observations ?? [], record.sourceUrl),
    price: { amount: null, unit: record.type === "stay" ? "night" : record.type === "cafe" ? "drink" : "person", petExtra: null },
    durationMinutes: record.durationMinutes ?? null,
    facts: admissionFacts(record.admissions),
    ...(record.amenities && Object.keys(record.amenities).length ? { amenities: record.amenities } : {}),
    sourceUrl: record.sourceUrl,
    ...(observedId ? { sourceId: observedId } : {}),
    sourceName: record.sourceName ?? (isVisitJeju ? "VisitJeju" : url.hostname),
    basicSourceCheckedAt,
    retrievedAt: record.retrievedAt,
    sourceUpdatedAt: null,
    verifiedAt: null,
    dataMode: "live",
  };
}

export function mapOfficialCatalog(records: readonly unknown[]): Place[] {
  const places = records.map(mapOfficialRecord);
  if (new Set(places.map((place) => place.id)).size !== places.length || new Set(places.map((place) => place.slug)).size !== places.length) {
    throw new Error("DUPLICATE_OFFICIAL_LISTING");
  }
  return places;
}
