import { z } from "zod";
import type { Place } from "@/lib/types";
import { ServiceError } from "./errors";

const text = (max = 500) => z.string().trim().max(max);
const localized = (max: number) =>
  z
    .object({ ko: text(max), en: text(max), zh: text(max), ja: text(max) })
    .strict();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(?:T[0-9:.+-]+Z?)?$/)
  .refine((value) => Number.isFinite(Date.parse(value)), "Invalid date");
// Companion freshness is measured by calendar day. Reject rolled-over dates and
// timestamps instead of accepting values the recommendation engine cannot read.
const factDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const timestamp = Date.parse(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
    );
  }, "Invalid verification day");
const httpsUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => new URL(value).protocol === "https:");
const fact = <T extends z.ZodType>(value: T) =>
  z
    .object({
      value: z.union([value, z.literal("unknown")]),
      source: z.enum(["demo", "official", "phone", "onsite", "unknown"]),
      verifiedAt: factDate.nullable(),
      sourceUrl: httpsUrl.optional(),
      note: localized(500).optional(),
    })
    .strict();
const access = z.enum(["yes", "conditional", "no"]);
const safeId = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const imagePath = z
  .string()
  .max(2048)
  .refine((value) => {
    if (value.startsWith("/assets/"))
      return (
        /^\/assets\/[a-zA-Z0-9_./-]+$/.test(value) &&
        !value.split("/").includes("..")
      );
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  });

export const placeSchema = z
  .object({
    id: safeId,
    slug: z.string().regex(/^[a-z0-9-]{1,120}$/),
    name: localized(120),
    summary: localized(1200),
    address: localized(300),
    district: localized(80),
    region: z.enum(["east", "west", "south", "north"]),
    type: z.enum([
      "restaurant",
      "cafe",
      "stay",
      "attraction",
      "experience",
      "walk",
    ]),
    lat: z.number().min(32).max(35),
    lng: z.number().min(125).max(128),
    image: imagePath,
    price: z
      .object({
        amount: z.number().min(0).max(10_000_000).nullable(),
        unit: z.enum(["person", "drink", "night"]),
        petExtra: z.number().min(0).max(1_000_000).nullable(),
      })
      .strict(),
    durationMinutes: z.number().int().min(0).max(1440),
    facts: z
      .object({
        operating: fact(z.enum(["open", "suspended", "closed"])),
        kidsEntry: fact(access),
        minAge: fact(z.number().int().min(0).max(100).nullable()),
        highChair: fact(z.boolean()),
        stroller: fact(access),
        petEntry: fact(z.enum(["indoor", "outdoor", "no"])),
        dogMaxWeight: fact(z.number().min(0).max(200).nullable()),
        dogWeightInclusive: fact(z.boolean()),
        carrierRequired: fact(z.boolean()),
        stepFree: fact(access),
        seating: fact(z.enum(["table", "mixed", "floor", "notApplicable"])),
        walkingMinutes: fact(z.number().min(0).max(1440).nullable()),
        parking: fact(z.enum(["onsite", "nearby", "none"])),
        toilet: fact(z.enum(["inside", "outside", "none"])),
      })
      .strict(),
    sourceUrl: httpsUrl.optional(),
    sourceId: text(100).optional(),
    sourceUpdatedAt: date.nullable().optional(),
    retrievedAt: date.nullable().optional(),
    verifiedAt: date.nullable(),
    dataMode: z.enum(["demo", "live"]),
  })
  .strict();

export const publicationStatus = z.enum([
  "draft",
  "published",
  "hidden",
  "suspended",
  "closed",
]);
export const imageRightsSchema = z
  .object({
    status: z.enum(["unverified", "permitted", "placeholder"]),
    sourceUrl: httpsUrl.optional(),
    credit: text(300),
    license: text(300),
  })
  .strict();
export const placeWriteSchema = z
  .object({
    place: placeSchema,
    status: publicationStatus,
    imageRights: imageRightsSchema,
  })
  .strict();
export const placeUpdateSchema = placeWriteSchema.extend({
  expectedUpdatedAt: date,
});
export type PlaceWrite = z.infer<typeof placeWriteSchema>;

export function assertPublishingReady(input: PlaceWrite): void {
  if (input.status !== "published") return;
  const { place } = input;
  if (
    place.dataMode !== "live" ||
    !place.name.ko ||
    !place.summary.ko ||
    !place.address.ko ||
    !place.sourceUrl
  ) {
    throw new ServiceError("PUBLICATION_INCOMPLETE", 400);
  }
  if (input.imageRights.status === "unverified")
    throw new ServiceError("IMAGE_RIGHTS_REQUIRED", 400);
  if (
    input.imageRights.status === "permitted" &&
    (!input.imageRights.credit || !input.imageRights.license)
  )
    throw new ServiceError("IMAGE_RIGHTS_REQUIRED", 400);
  if (
    input.imageRights.status === "placeholder" &&
    !place.image.startsWith("/assets/icons/")
  )
    throw new ServiceError("INVALID_PLACEHOLDER", 400);
  for (const key of [
    "operating",
    "kidsEntry",
    "petEntry",
    "stepFree",
    "parking",
  ] as const) {
    const evidence = place.facts[key];
    if (
      evidence.value === "unknown" ||
      !evidence.verifiedAt ||
      evidence.source === "unknown" ||
      evidence.source === "demo" ||
      Date.parse(evidence.verifiedAt) > Date.now()
    ) {
      throw new ServiceError("VERIFICATION_REQUIRED", 400);
    }
  }
  if (place.facts.operating.value !== "open")
    throw new ServiceError("PLACE_NOT_OPEN", 400);
}

/** Reconstruct the allowlisted object; never spread a Firestore document into a public response. */
export function toPublicPlace(value: unknown): Place | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const input = Object.fromEntries(
    Object.keys(placeSchema.shape).map((key) => [key, raw[key]]),
  );
  // Internal fact attributes may exist in older operational records. Strip them before validation.
  if (raw.facts && typeof raw.facts === "object") {
    input.facts = Object.fromEntries(
      Object.entries(raw.facts as Record<string, unknown>).map(
        ([key, evidence]) => {
          if (!evidence || typeof evidence !== "object") return [key, evidence];
          const entry = evidence as Record<string, unknown>;
          return [
            key,
            Object.fromEntries(
              ["value", "source", "verifiedAt", "sourceUrl", "note"]
                .filter((field) => entry[field] !== undefined)
                .map((field) => [field, entry[field]]),
            ),
          ];
        },
      ),
    );
  }
  const result = placeSchema.safeParse(input);
  return result.success ? result.data : null;
}
