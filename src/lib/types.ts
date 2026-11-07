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

export interface Place {
  id: string;
  slug: string;
  name: LocalizedText;
  summary: LocalizedText;
  address: LocalizedText;
  district: LocalizedText;
  region: Region;
  type: PlaceType;
  lat: number;
  lng: number;
  image: string;
  price: {
    amount: number | null;
    unit: "person" | "drink" | "night";
    petExtra: number | null;
  };
  durationMinutes: number;
  facts: PlaceFacts;
  sourceUrl?: string;
  sourceId?: string;
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
