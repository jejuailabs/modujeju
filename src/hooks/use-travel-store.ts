"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Profile } from "../lib/types";
import {
  TRAVEL_STORAGE_KEY,
  assignPlaceToDay,
  clearSavedPlaces,
  createInitialTravelData,
  isIsoDate,
  movePlaceInDay,
  normalizeProfile,
  normalizeTravelData,
  parseTravelData,
  removePlaceFromDay,
  resizeTrip,
  toggleSavedPlace,
  type TravelData,
} from "../lib/trip/state";

export { defaultProfile } from "../lib/trip/state";

interface TravelSnapshot extends TravelData {
  hydrated: boolean;
  storageError: boolean;
  recovered: boolean;
}

const serverSnapshot: TravelSnapshot = {
  ...createInitialTravelData(),
  hydrated: false,
  storageError: false,
  recovered: false,
};
let snapshot: TravelSnapshot = serverSnapshot;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function dataOnly(value: TravelSnapshot): TravelData {
  return {
    version: value.version,
    profile: value.profile,
    savedIds: value.savedIds,
    tripDays: value.tripDays,
    itinerary: value.itinerary,
    tripStartDate: value.tripStartDate,
  };
}

function hydrate() {
  if (typeof window === "undefined" || snapshot.hydrated) return;
  try {
    const parsed = parseTravelData(
      window.localStorage.getItem(TRAVEL_STORAGE_KEY),
    );
    snapshot = {
      ...parsed.data,
      hydrated: true,
      storageError: false,
      recovered: parsed.recovered,
    };
  } catch {
    snapshot = { ...snapshot, hydrated: true, storageError: true };
  }
  notify();
}

function update(updater: (data: TravelData) => TravelData) {
  if (typeof window === "undefined") return;
  hydrate();
  const data = normalizeTravelData(updater(dataOnly(snapshot)));
  let storageError = false;
  try {
    window.localStorage.setItem(TRAVEL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // The in-memory session still works when browser storage is unavailable.
    storageError = true;
  }
  snapshot = { ...data, hydrated: true, storageError, recovered: false };
  notify();
}

function onStorage(event: StorageEvent) {
  if (event.key !== TRAVEL_STORAGE_KEY && event.key !== null) return;
  try {
    if (event.storageArea && event.storageArea !== window.localStorage) return;
  } catch {
    return;
  }
  const parsed = parseTravelData(event.newValue);
  snapshot = {
    ...parsed.data,
    hydrated: true,
    storageError: snapshot.storageError,
    recovered: parsed.recovered,
  };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined")
    window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined")
      window.removeEventListener("storage", onStorage);
  };
}

const actions = {
  setProfile(next: Partial<Profile> | ((previous: Profile) => Profile)) {
    update((data) => ({
      ...data,
      profile: normalizeProfile(
        typeof next === "function"
          ? next(normalizeProfile(data.profile))
          : { ...data.profile, ...next },
      ),
    }));
  },
  toggleSaved(id: string) {
    update((data) => toggleSavedPlace(data, id));
  },
  clearSaved() {
    update(clearSavedPlaces);
  },
  setTripDays(days: number) {
    update((data) => resizeTrip(data, days));
  },
  assignPlace(day: number, id: string) {
    update((data) => assignPlaceToDay(data, day, id));
  },
  removeFromDay(day: number, id: string) {
    update((data) => removePlaceFromDay(data, day, id));
  },
  moveInDay(day: number, id: string, direction: -1 | 1) {
    update((data) => movePlaceInDay(data, day, id, direction));
  },
  setTripStartDate(date: string) {
    if (date !== "" && !isIsoDate(date)) return;
    update((data) => ({ ...data, tripStartDate: date }));
  },
};

export function useTravelStore() {
  const current = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );
  useEffect(hydrate, []);
  return { ...current, ...actions };
}
