import type { FacilityKey, FeatureKey } from "./place-features";

export const locales = ["ko", "en", "zh", "ja"] as const;
export type Locale = (typeof locales)[number];
export type LocalizedText = Record<Locale, string>;
export type Companion = "kids" | "pet" | "senior";
export type Region = "east" | "west" | "south" | "north";
export type PlaceType =
  "restaurant" | "cafe" | "stay" | "attraction" | "experience" | "walk";
export type Verdict = "fit" | "conditional" | "unknown" | "notFit";
export type Access = "yes" | "conditional" | "no";
export type FactSource = "demo" | "official" | "phone" | "onsite" | "unknown";

export interface Fact<T> {
  value: T | "unknown";
  source: FactSource;
  /** Actual verification date, never the date a page was downloaded. */
  verifiedAt: string | null;
  sourceUrl?: string;
  note?: LocalizedText;
}

export interface PlaceFacts {
  operating: Fact<"open" | "suspended" | "closed">;
  kidsEntry: Fact<Access>;
  minAge: Fact<number | null>;
  highChair: Fact<boolean>;
  stroller: Fact<Access>;
  petEntry: Fact<"indoor" | "outdoor" | "no">;
  /** null means an explicitly confirmed lack of weight limit. */
  dogMaxWeight: Fact<number | null>;
  dogWeightInclusive: Fact<boolean>;
  carrierRequired: Fact<boolean>;
  stepFree: Fact<Access>;
  seating: Fact<"table" | "mixed" | "floor" | "notApplicable">;
  walkingMinutes: Fact<number | null>;
  parking: Fact<"onsite" | "nearby" | "none">;
  toilet: Fact<"inside" | "outside" | "none">;
}

/**
 * Who established a facility. `search` means an operator approved a dated
 * public source found by the search pipeline; it is never raw AI output.
 * `listing` means a dated facility entry on another family/pet travel app
 * (e.g. 맘맘), shown with its link and only after operator approval.
 */
export type AmenitySource = "demo" | "official" | "phone" | "onsite" | "search" | "listing";

/** One reviewed facility (e.g. nursing room, large-dog area) with its evidence. */
export interface AmenityEvidence {
  value: Access | "unknown";
  source: AmenitySource;
  /** Date an operator verified or approved this item, never a crawl date. */
  verifiedAt: string | null;
  sourceUrl?: string;
  /** Publication date of the source text. Required (2025+) for `search`. */
  publishedAt?: string | null;
  /** Short reviewed excerpt shown beside the source link. */
  quote?: string;
  /** Countable facilities such as high chairs. */
  quantity?: number;
  note?: LocalizedText;
}

export interface Place {
  id: string;
  slug: string;
  name: LocalizedText;
  summary: LocalizedText;
  address: LocalizedText;
  district: LocalizedText;
  region: Region;
  type: PlaceType;
  lat: number | null;
  lng: number | null;
  /** Map position evidence, independent of companion-policy verification. */
  coordinateSource?: {
    sourceName: string;
    sourceUrl: string;
    checkedAt: string;
    /** Place-level reference point, not a verified entrance or parking location. */
    kind: "place-center";
  };
  image: string;
  imageKind?: "placeholder" | "photo" | "illustration";
  /** Observed official-page photo reference; does not assert a usage license. */
  photoSource?: {
    sourceId: string;
    sourceUrl: string;
    photoUrl: string;
    alt: string;
    observedAt: string;
    sourceName: "비짓제주";
  };
  tags?: string[];
  /** Labels observed on the source, not verified companion conditions. */
  sourceTags?: string[];
  sourceObservations?: {
    field: string;
    value: string;
    sourceUrl: string;
    /** Evidence review date. Explicit null means undated, not the listing observation date. */
    verifiedAt?: string | null;
  }[];
  price: {
    amount: number | null;
    unit: "person" | "drink" | "night";
    petExtra: number | null;
  };
  durationMinutes: number | null;
  facts: PlaceFacts;
  /** Companion-specific facilities. Curated facts outrank these entries. */
  amenities?: Partial<Record<FacilityKey, AmenityEvidence>>;
  sourceUrl?: string;
  sourceId?: string;
  sourceName?: string;
  /** Date the basic listing was observed; never a companion-policy verification. */
  basicSourceCheckedAt?: string;
  sourceUpdatedAt?: string | null;
  retrievedAt?: string | null;
  /** Summary verification date. Individual facts remain authoritative. */
  verifiedAt: string | null;
  dataMode: "demo" | "live";
}

export interface Profile {
  companions: Companion[];
  regions: Region[];
  types: PlaceType[];
  budgets: Partial<Record<PlaceType, number>>;
  childAge: number | null;
  stroller: boolean;
  dogWeight: number | null;
  indoorPet: boolean;
  stepFree: boolean;
  shortWalk: boolean;
}

export interface Reason {
  code: string;
  verdict: Verdict;
  message: LocalizedText;
  companion?: Companion;
  factKey?: keyof PlaceFacts;
}

export interface Evaluation {
  verdict: Verdict;
  reasons: Reason[];
  companionVerdicts: Partial<Record<Companion, Verdict>>;
  isDemo: boolean;
}

export interface PlaceMatch {
  place: Place;
  evaluation: Evaluation;
}

export interface CatalogOptions {
  features?: FeatureKey[];
  /** Explicitly includes conditional facilities, never unknown ones. */
  includeConditionalFeatures?: boolean;
  query?: string;
  sort?: "recommended" | "price" | "duration" | "name";
  includeNotFit?: boolean;
  includeUnknown?: boolean;
  locale?: Locale;
  /** Fixed current time for reproducible tests; defaults to current time. */
  now?: Date;
}

export const regions: Region[] = ["east", "west", "south", "north"];
export const placeTypes: PlaceType[] = [
  "restaurant",
  "cafe",
  "stay",
  "attraction",
  "experience",
  "walk",
];
export const companions: Companion[] = ["kids", "pet", "senior"];

export function createDefaultProfile(): Profile {
  return {
    companions: [],
    regions: [],
    types: [],
    budgets: {},
    childAge: null,
    stroller: false,
    dogWeight: null,
    indoorPet: false,
    stepFree: false,
    shortWalk: false,
  };
}

export function unknownFact<T>(): Fact<T> {
  return { value: "unknown", source: "unknown", verifiedAt: null };
}

export function createUnknownFacts(): PlaceFacts {
  return {
    operating: unknownFact(),
    kidsEntry: unknownFact(),
    minAge: unknownFact(),
    highChair: unknownFact(),
    stroller: unknownFact(),
    petEntry: unknownFact(),
    dogMaxWeight: unknownFact(),
    dogWeightInclusive: unknownFact(),
    carrierRequired: unknownFact(),
    stepFree: unknownFact(),
    seating: unknownFact(),
    walkingMinutes: unknownFact(),
    parking: unknownFact(),
    toilet: unknownFact(),
  };
}
