import type { Place, PlaceMatch, PlaceType, Profile, Region } from "../types";
import { browseCategory } from "../place-categories";
import { evaluatePlace, verdictSeverity } from "../verdict/evaluate";
import { MAX_TRIP_DAYS, isPlaceId, normalizeProfile } from "./state";

export { validateSavedItinerarySnapshot } from "./state";

const REGION_RING: Region[] = ["north", "east", "south", "west"];
const ESSENTIAL_TYPES: PlaceType[] = ["restaurant", "cafe", "stay", "attraction"];
const DAY_TYPES: PlaceType[] = ["attraction", "restaurant", "cafe", "experience", "walk"];

export type TripExclusionReason = "missing" | "demo" | "closed" | "not-fit" | "region" | "over-budget" | "price-unknown";
export type TripWarningCode = "no-saved-places" | "missing-coordinates" | "unverified-conditions" | "conditional-conditions" | "no-stay-in-region" | "unassigned-saved-places" | "partial-day-types" | "opening-hours-unverified";
export interface TripWarning {
  code: TripWarningCode;
  day?: number;
  placeIds: string[];
}

export interface SuggestedTripDay {
  day: number;
  region: Region | null;
  stops: PlaceMatch[];
  /** A saved accommodation candidate, not a reservation or confirmed availability. */
  stayPlaceId: string | null;
  stayRegion: Region | null;
  reason: "saved-region-cluster" | "saved-stay-base" | "no-eligible-places";
  routeBasis: "coordinates" | "region-only" | "mixed";
  /** Sum of straight-line legs, never a road distance or travel time. */
  straightLineKm: number | null;
  missingTypes: PlaceType[];
  requiresConfirmationIds: string[];
}

export interface SavedTripRecommendation {
  method: "rules";
  nights: number;
  tripDays: number;
  days: SuggestedTripDay[];
  /** Compatible with stored travel data: every place appears at most once. */
  itinerary: Record<string, string[]>;
  missingTypes: PlaceType[];
  excluded: { placeId: string; reason: TripExclusionReason }[];
  unassignedIds: string[];
  warnings: TripWarning[];
}

export interface RecommendSavedTripInput {
  places: readonly Place[];
  savedIds: readonly string[];
  profile: Profile;
  nights: number;
  now?: Date;
  options?: {
    /** Ordering hint only; cannot introduce places, regions or bypass eligibility. */
    preferredRegionOrder?: readonly Region[];
  };
}

function coordinates(place: Place): [number, number] | null {
  const { lat, lng } = place;
  return lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    && (lat !== 0 || lng !== 0) ? [lat, lng] : null;
}

export function straightLineDistanceKm(a: Place, b: Place): number | null {
  const from = coordinates(a);
  const to = coordinates(b);
  if (!from || !to) return null;
  const radians = (value: number) => value * Math.PI / 180;
  const lat = radians(to[0] - from[0]);
  const lng = radians(to[1] - from[1]);
  const haversine = Math.sin(lat / 2) ** 2
    + Math.cos(radians(from[0])) * Math.cos(radians(to[0])) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
}

function regionHops(a: Region, b: Region): number {
  const difference = Math.abs(REGION_RING.indexOf(a) - REGION_RING.indexOf(b));
  return Math.min(difference, REGION_RING.length - difference);
}

function overnightCandidate(candidates: PlaceMatch[], region: Region | null, anchor: Place | undefined, previousStay: Place | undefined): PlaceMatch | undefined {
  if (!region) return undefined;
  // Adjacent broad regions are a fallback, not a promise of a short road journey.
  return candidates.filter(({ place }) => regionHops(region, place.region) <= 1)
    .sort((a, b) => {
      const proximity = regionHops(region, a.place.region) - regionHops(region, b.place.region);
      if (proximity) return proximity;
      const suitability = verdictSeverity[a.evaluation.verdict] - verdictSeverity[b.evaluation.verdict];
      if (suitability) return suitability;
      // Keep a suitable base for consecutive nights before making an unnecessary hotel change.
      const continuity = Number(b.place.id === previousStay?.id) - Number(a.place.id === previousStay?.id);
      if (continuity) return continuity;
      const distanceA = anchor ? straightLineDistanceKm(anchor, a.place) : null;
      const distanceB = anchor ? straightLineDistanceKm(anchor, b.place) : null;
      return distanceA !== null && distanceB !== null ? distanceA - distanceB : 0;
    })[0];
}

/** Only measured coordinates affect intra-region ordering. Missing points stay explicit. */
function orderStops(stops: PlaceMatch[], previous: Place | undefined): PlaceMatch[] {
  const remaining = [...stops];
  const ordered: PlaceMatch[] = [];
  let current = previous;
  while (remaining.length) {
    let next = 0;
    if (current && coordinates(current)) {
      let nearest = Infinity;
      remaining.forEach(({ place }, index) => {
        const distance = straightLineDistanceKm(current!, place);
        if (distance !== null && distance < nearest) {
          nearest = distance;
          next = index;
        }
      });
    }
    const [selected] = remaining.splice(next, 1);
    ordered.push(selected);
    current = selected.place;
  }
  return ordered;
}

function routeSummary(places: Place[]): Pick<SuggestedTripDay, "routeBasis" | "straightLineKm"> {
  const known = places.filter((place) => coordinates(place) !== null).length;
  const routeBasis = known === 0 ? "region-only" : known === places.length ? "coordinates" : "mixed";
  if (known !== places.length || places.length < 2) return { routeBasis, straightLineKm: null };
  const distance = places.slice(1).reduce((sum, place, index) => sum + (straightLineDistanceKm(places[index], place) ?? 0), 0);
  return { routeBasis, straightLineKm: Math.round(distance * 10) / 10 };
}

/** A rule-based draft from saved real records, with unknown conditions kept visible. */
export function recommendSavedTrip(input: RecommendSavedTripInput): SavedTripRecommendation {
  const nights = Number.isFinite(input.nights) ? Math.min(MAX_TRIP_DAYS - 1, Math.max(1, Math.floor(input.nights))) : 2;
  const tripDays = nights + 1;
  const profile = normalizeProfile(input.profile);
  const now = input.now ?? new Date();
  const byId = new Map(input.places.map((place) => [place.id, place]));
  const savedIds = [...new Set(input.savedIds.filter(isPlaceId))];
  const excluded: SavedTripRecommendation["excluded"] = [];
  const eligible: PlaceMatch[] = [];
  const warnings: TripWarning[] = [];
  for (const placeId of savedIds) {
    const place = byId.get(placeId);
    let reason: TripExclusionReason | null = !place ? "missing" : place.dataMode !== "live" ? "demo" : null;
    if (place && !reason) {
      const budget = profile.budgets[place.type] ?? profile.budgets[browseCategory(place.type)];
      if (place.facts.operating.value === "closed" || place.facts.operating.value === "suspended") reason = "closed";
      else if (profile.regions.length && !profile.regions.includes(place.region)) reason = "region";
      else if (budget !== undefined && place.price.amount === null) reason = "price-unknown";
      else if (budget !== undefined && place.price.amount !== null && place.price.amount > budget) reason = "over-budget";
      else {
        const evaluation = evaluatePlace(place, profile, now);
        if (evaluation.verdict === "notFit") reason = "not-fit";
        else eligible.push({ place, evaluation });
      }
    }
    if (reason) excluded.push({ placeId, reason });
  }
  // Preserve saved order among equal suitability scores. A missing price or fact is never fabricated.
  eligible.sort((a, b) => verdictSeverity[a.evaluation.verdict] - verdictSeverity[b.evaluation.verdict]);
  const grouped = new Map(REGION_RING.map((region) => [region, eligible.filter(({ place }) => place.region === region)]));
  const savedStays = eligible.filter(({ place }) => place.type === "stay");
  const hasDaytimeStops = eligible.some(({ place }) => place.type !== "stay");
  // A hotel-only region is a night base, not an empty final sightseeing day.
  const regionWeight = (region: Region) => grouped.get(region)!.filter(({ place }) => !hasDaytimeStops || place.type !== "stay").length;
  const activeRegions = REGION_RING.filter((region) => regionWeight(region) > 0)
    .sort((a, b) => regionWeight(b) - regionWeight(a))
    .slice(0, tripDays);
  const hinted = [...new Set(input.options?.preferredRegionOrder ?? [])]
    .filter((region) => REGION_RING.includes(region) && activeRegions.includes(region));
  const remainingRegions = [...activeRegions];
  const orderedRegions: Region[] = [];
  for (const region of hinted) {
    orderedRegions.push(region);
    remainingRegions.splice(remainingRegions.indexOf(region), 1);
  }
  while (remainingRegions.length) {
    const previous = orderedRegions.at(-1);
    if (previous) remainingRegions.sort((a, b) => regionHops(previous, a) - regionHops(previous, b)
      || regionWeight(b) - regionWeight(a));
    orderedRegions.push(remainingRegions.shift()!);
  }
  const allocations = new Map(orderedRegions.map((region) => [region, 1]));
  for (let assigned = orderedRegions.length; assigned < tripDays && orderedRegions.length; assigned++) {
    const region = [...orderedRegions].sort((a, b) => regionWeight(b) / (allocations.get(b)! + 1)
      - regionWeight(a) / (allocations.get(a)! + 1))[0];
    allocations.set(region, allocations.get(region)! + 1);
  }
  const dayRegions = orderedRegions.flatMap((region) => Array<Region>(allocations.get(region)!).fill(region));
  const used = new Set<string>();
  const days: SuggestedTripDay[] = [];
  const itinerary: Record<string, string[]> = {};
  const dayLimit = profile.shortWalk || profile.companions.includes("kids") ? 3 : 4;
  let previousStay: Place | undefined;
  for (let index = 0; index < tripDays; index++) {
    const day = index + 1;
    const region = dayRegions[index] ?? null;
    const bucket = region ? grouped.get(region)! : [];
    const remaining = bucket.filter(({ place }) => place.type !== "stay" && !used.has(place.id));
    const remainingDays = dayRegions.slice(index).filter((value) => value === region).length;
    const count = Math.min(dayLimit, Math.ceil(remaining.length / Math.max(1, remainingDays)));
    const selected: PlaceMatch[] = [];
    // Cover different useful stop types before repeating one, without inventing missing categories.
    for (const type of DAY_TYPES) {
      if (selected.length >= count) break;
      const candidate = remaining.find(({ place }) => place.type === type);
      if (candidate) selected.push(candidate);
    }
    for (const candidate of remaining) {
      if (selected.length >= count) break;
      if (!selected.includes(candidate)) selected.push(candidate);
    }
    const stops = orderStops(selected, previousStay);
    const stay = index < nights ? overnightCandidate(savedStays, region, stops.at(-1)?.place, previousStay) : undefined;
    for (const { place } of stops) used.add(place.id);
    const newIds = stops.map(({ place }) => place.id);
    if (stay && !used.has(stay.place.id)) {
      newIds.push(stay.place.id);
      used.add(stay.place.id);
    }
    if (newIds.length) itinerary[String(day)] = newIds;
    const matches = [...stops, ...(stay ? [stay] : [])];
    const requiresConfirmationIds = matches.filter(({ evaluation }) => evaluation.verdict !== "fit").map(({ place }) => place.id);
    const missingTypes = ESSENTIAL_TYPES.filter((type) => (type !== "stay" || index < nights)
      && !matches.some(({ place }) => place.type === type));
    const routePlaces = [
      ...(previousStay ? [previousStay] : []),
      ...stops.map(({ place }) => place),
      ...(stay && stay.place.id !== stops.at(-1)?.place.id ? [stay.place] : []),
    ];
    days.push({
      day, region, stops,
      stayPlaceId: stay?.place.id ?? null,
      stayRegion: stay?.place.region ?? (index < nights ? region : null),
      reason: stops.length ? "saved-region-cluster" : stay ? "saved-stay-base" : "no-eligible-places",
      ...routeSummary(routePlaces),
      missingTypes,
      requiresConfirmationIds,
    });
    const missingCoordinates = matches.filter(({ place }) => !coordinates(place)).map(({ place }) => place.id);
    if (previousStay && !coordinates(previousStay) && !missingCoordinates.includes(previousStay.id)) missingCoordinates.push(previousStay.id);
    if (missingCoordinates.length) warnings.push({ code: "missing-coordinates", day, placeIds: missingCoordinates });
    const unknown = matches.filter(({ evaluation }) => evaluation.verdict === "unknown").map(({ place }) => place.id);
    const conditional = matches.filter(({ evaluation }) => evaluation.verdict === "conditional").map(({ place }) => place.id);
    if (unknown.length) warnings.push({ code: "unverified-conditions", day, placeIds: unknown });
    if (conditional.length) warnings.push({ code: "conditional-conditions", day, placeIds: conditional });
    if (index < nights && !stay) warnings.push({ code: "no-stay-in-region", day, placeIds: [] });
    if (missingTypes.length) warnings.push({ code: "partial-day-types", day, placeIds: [] });
    previousStay = stay?.place;
  }
  const unassignedIds = eligible.filter(({ place }) => !used.has(place.id)).map(({ place }) => place.id);
  if (!savedIds.length) warnings.push({ code: "no-saved-places", placeIds: [] });
  if (unassignedIds.length) warnings.push({ code: "unassigned-saved-places", placeIds: unassignedIds });
  if (used.size) warnings.push({ code: "opening-hours-unverified", placeIds: [...used] });
  return {
    method: "rules", nights, tripDays, days, itinerary,
    missingTypes: ESSENTIAL_TYPES.filter((type) => !eligible.some(({ place }) => used.has(place.id) && place.type === type)),
    excluded, unassignedIds, warnings,
  };
}
