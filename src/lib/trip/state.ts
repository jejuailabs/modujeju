import {
  companions,
  createDefaultProfile,
  placeTypes,
  regions,
  type PlaceType,
  type Profile,
  type Region,
} from "../types";

export const TRAVEL_STORAGE_KEY = "modujeju.travel.v1";
export const TRAVEL_STATE_VERSION = 1 as const;
export const MAX_TRIP_DAYS = 5;
export const MAX_SAVED_PLACES = 200;

export interface OvernightStay {
  region: Region;
  /** A saved accommodation candidate; null means only a suggested overnight region. */
  placeId: string | null;
}

export interface TravelData {
  version: typeof TRAVEL_STATE_VERSION;
  profile: Profile;
  savedIds: string[];
  tripDays: number;
  /** One-based day numbers, e.g. { "1": ["place-id"] }. */
  itinerary: Record<string, string[]>;
  tripStartDate: string;
  /** One-based nights, strictly before the final travel day. Optional for version-1 compatibility. */
  overnightByDay?: Record<string, OvernightStay>;
}

export interface RecommendedTripDraft {
  tripDays: number;
  itinerary: Record<string, string[]>;
  days: readonly {
    day: number;
    stayRegion: Region | null;
    stayPlaceId: string | null;
  }[];
}

export interface ParsedTravelData {
  data: TravelData;
  recovered: boolean;
}

export const defaultProfile = createDefaultProfile();

export function createInitialTravelData(): TravelData {
  return {
    version: TRAVEL_STATE_VERSION,
    profile: createDefaultProfile(),
    savedIds: [],
    tripDays: 3,
    itinerary: {},
    tripStartDate: "",
  };
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function enumList<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (item): item is T =>
          typeof item === "string" && allowed.includes(item as T),
      ),
    ),
  ];
}

function boundedNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

export function normalizeProfile(value: unknown): Profile {
  const input = object(value);
  const budgets: Partial<Record<PlaceType, number>> = {};
  const inputBudgets = object(input.budgets);
  for (const type of placeTypes) {
    const value = boundedNumber(inputBudgets[type], 0, 10_000_000);
    if (value !== null) budgets[type] = Math.round(value);
  }
  const age = boundedNumber(input.childAge, 0, 17);
  return {
    companions: enumList(input.companions, companions),
    regions: enumList(input.regions, regions),
    types: enumList(input.types, placeTypes),
    budgets,
    childAge: age === null ? null : Math.floor(age),
    stroller: input.stroller === true,
    dogWeight: boundedNumber(input.dogWeight, 0.1, 200),
    indoorPet: input.indoorPet === true,
    stepFree: input.stepFree === true,
    shortWalk: input.shortWalk === true,
  };
}

export function isPlaceId(value: unknown): value is string {
  return (
    typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(value)
  );
}

function placeIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter(isPlaceId))].slice(0, MAX_SAVED_PLACES)
    : [];
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function normalizeTravelData(value: unknown): TravelData {
  const input = object(value);
  const savedIds = placeIds(input.savedIds);
  const savedSet = new Set(savedIds);
  const rawDays = boundedNumber(input.tripDays, 1, MAX_TRIP_DAYS);
  const tripDays = rawDays === null ? 3 : Math.floor(rawDays);
  const inputItinerary = object(input.itinerary);
  const itinerary: Record<string, string[]> = {};
  const assigned = new Set<string>();
  for (let day = 1; day <= tripDays; day++) {
    const ids = placeIds(inputItinerary[String(day)]).filter((id) => {
      if (!savedSet.has(id) || assigned.has(id)) return false;
      assigned.add(id);
      return true;
    });
    if (ids.length) itinerary[String(day)] = ids;
  }
  const overnightByDay: Record<string, OvernightStay> = {};
  const inputOvernights = object(input.overnightByDay);
  for (let day = 1; day < tripDays; day++) {
    const overnight = object(inputOvernights[String(day)]);
    if (!regions.includes(overnight.region as Region)) continue;
    if (overnight.placeId !== null && (!isPlaceId(overnight.placeId) || !savedSet.has(overnight.placeId))) continue;
    overnightByDay[String(day)] = { region: overnight.region as Region, placeId: overnight.placeId as string | null };
  }
  return {
    version: TRAVEL_STATE_VERSION,
    profile: normalizeProfile(input.profile),
    savedIds,
    tripDays,
    itinerary,
    tripStartDate: isIsoDate(input.tripStartDate) ? input.tripStartDate : "",
    ...(input.overnightByDay !== undefined ? { overnightByDay } : {}),
  };
}

/** Unknown future schemas are not interpreted as valid data. */
export function parseTravelData(raw: string | null): ParsedTravelData {
  if (!raw) return { data: createInitialTravelData(), recovered: false };
  try {
    const input = object(JSON.parse(raw));
    if (input.version !== 1 && input.version !== 0) {
      return { data: createInitialTravelData(), recovered: true };
    }
    // Version 0 used favorites for saved place IDs.
    const migrated =
      input.version === 0
        ? { ...input, savedIds: input.savedIds ?? input.favorites, version: 1 }
        : input;
    const data = normalizeTravelData(migrated);
    const comparable = {
      version: input.version,
      profile: input.profile,
      savedIds: input.savedIds,
      tripDays: input.tripDays,
      itinerary: input.itinerary,
      tripStartDate: input.tripStartDate,
      ...(input.overnightByDay !== undefined ? { overnightByDay: input.overnightByDay } : {}),
    };
    return {
      data,
      recovered: JSON.stringify(comparable) !== JSON.stringify(data),
    };
  } catch {
    return { data: createInitialTravelData(), recovered: true };
  }
}

/** Strict boundary for a draft: reject foreign IDs and cross-day duplicates instead of repairing them. */
export function validateSavedItinerarySnapshot(value: unknown, allowedSavedIds: readonly string[], tripDays: number): Record<string, string[]> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || !Number.isInteger(tripDays) || tripDays < 1 || tripDays > MAX_TRIP_DAYS) return null;
  const allowed = new Set(allowedSavedIds.filter(isPlaceId));
  const used = new Set<string>();
  const result: Record<string, string[]> = {};
  for (const [day, ids] of Object.entries(value)) {
    if (!/^[1-5]$/.test(day) || Number(day) > tripDays || !Array.isArray(ids)) return null;
    const next: string[] = [];
    for (const id of ids) {
      if (!isPlaceId(id) || !allowed.has(id) || used.has(id)) return null;
      used.add(id);
      next.push(id);
    }
    if (next.length) result[day] = next;
  }
  return result;
}

/** Replaces all days and overnight suggestions atomically after validating against the current saved list. */
export function applyRecommendedTrip(data: TravelData, draft: RecommendedTripDraft): TravelData {
  if (!draft || draft.tripDays < 2 || !Array.isArray(draft.days) || draft.days.length !== draft.tripDays) return data;
  const itinerary = validateSavedItinerarySnapshot(draft.itinerary, data.savedIds, draft.tripDays);
  if (!itinerary) return data;
  const saved = new Set(data.savedIds);
  const seenDays = new Set<number>();
  const overnightByDay: Record<string, OvernightStay> = {};
  for (const day of draft.days) {
    if (!day || !Number.isInteger(day.day) || day.day < 1 || day.day > draft.tripDays || seenDays.has(day.day)) return data;
    seenDays.add(day.day);
    if (day.stayRegion !== null && !regions.includes(day.stayRegion)) return data;
    if (day.stayPlaceId !== null && (!isPlaceId(day.stayPlaceId) || !saved.has(day.stayPlaceId))) return data;
    if (day.day === draft.tripDays) {
      if (day.stayRegion !== null || day.stayPlaceId !== null) return data;
      continue;
    }
    if (day.stayPlaceId !== null) {
      if (day.stayRegion === null || !Object.entries(itinerary).some(([key, ids]) => Number(key) <= day.day && ids.includes(day.stayPlaceId!))) return data;
    }
    if (day.stayRegion !== null) overnightByDay[String(day.day)] = { region: day.stayRegion, placeId: day.stayPlaceId };
  }
  return { ...data, tripDays: draft.tripDays, itinerary, overnightByDay };
}

function withoutOvernightSuggestions(data: TravelData, affectedDays: Set<number>, removedPlaceId?: string): Pick<TravelData, "overnightByDay"> {
  if (!data.overnightByDay) return {};
  return { overnightByDay: Object.fromEntries(Object.entries(data.overnightByDay).filter(([day, stay]) =>
    !affectedDays.has(Number(day)) && (!removedPlaceId || stay.placeId !== removedPlaceId))) };
}

export function toggleSavedPlace(data: TravelData, id: string): TravelData {
  if (!isPlaceId(id)) return data;
  if (!data.savedIds.includes(id)) {
    if (data.savedIds.length >= MAX_SAVED_PLACES) return data;
    return { ...data, savedIds: [...data.savedIds, id] };
  }
  const itinerary = Object.fromEntries(
    Object.entries(data.itinerary).map(([day, ids]) => [
      day,
      ids.filter((savedId) => savedId !== id),
    ]),
  );
  return {
    ...data,
    savedIds: data.savedIds.filter((savedId) => savedId !== id),
    itinerary,
    ...withoutOvernightSuggestions(data, new Set(Object.entries(data.itinerary).filter(([, ids]) => ids.includes(id)).map(([day]) => Number(day))), id),
  };
}

export function clearSavedPlaces(data: TravelData): TravelData {
  return { ...data, savedIds: [], itinerary: {}, ...(data.overnightByDay ? { overnightByDay: {} } : {}) };
}

export function resizeTrip(data: TravelData, days: number): TravelData {
  if (!Number.isFinite(days)) return data;
  const tripDays = Math.min(MAX_TRIP_DAYS, Math.max(1, Math.floor(days)));
  return {
    ...data,
    tripDays,
    itinerary: Object.fromEntries(
      Object.entries(data.itinerary).filter(([day]) => Number(day) <= tripDays),
    ),
    ...(data.overnightByDay ? { overnightByDay: Object.fromEntries(Object.entries(data.overnightByDay).filter(([day]) => Number(day) < tripDays)) } : {}),
  };
}

export function assignPlaceToDay(
  data: TravelData,
  day: number,
  id: string,
): TravelData {
  if (
    !Number.isInteger(day) ||
    day < 1 ||
    day > data.tripDays ||
    !isPlaceId(id)
  )
    return data;
  if (!data.savedIds.includes(id) && data.savedIds.length >= MAX_SAVED_PLACES)
    return data;
  if (data.itinerary[String(day)]?.includes(id)) return data;
  const itinerary = Object.fromEntries(
    Object.entries(data.itinerary).map(([key, ids]) => [
      key,
      ids.filter((savedId) => savedId !== id),
    ]),
  );
  itinerary[String(day)] = [...(itinerary[String(day)] ?? []), id];
  return {
    ...data,
    savedIds: data.savedIds.includes(id)
      ? data.savedIds
      : [...data.savedIds, id],
    itinerary,
    ...withoutOvernightSuggestions(data, new Set([day, ...Object.entries(data.itinerary).filter(([, ids]) => ids.includes(id)).map(([key]) => Number(key))]), id),
  };
}

export function removePlaceFromDay(
  data: TravelData,
  day: number,
  id: string,
): TravelData {
  if (!data.itinerary[String(day)]?.includes(id)) return data;
  return {
    ...data,
    itinerary: {
      ...data.itinerary,
      [String(day)]: data.itinerary[String(day)].filter(
        (savedId) => savedId !== id,
      ),
    },
    ...withoutOvernightSuggestions(data, new Set([day]), id),
  };
}

export function movePlaceInDay(
  data: TravelData,
  day: number,
  id: string,
  direction: -1 | 1,
): TravelData {
  if (direction !== -1 && direction !== 1) return data;
  const ids = data.itinerary[String(day)];
  if (!ids) return data;
  const index = ids.indexOf(id);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= ids.length) return data;
  const moved = [...ids];
  [moved[index], moved[destination]] = [moved[destination], moved[index]];
  return { ...data, itinerary: { ...data.itinerary, [String(day)]: moved } };
}

export function tripDayDate(startDate: string, day: number): string | null {
  if (
    !isIsoDate(startDate) ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > MAX_TRIP_DAYS
  )
    return null;
  const date = new Date(`${startDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}
