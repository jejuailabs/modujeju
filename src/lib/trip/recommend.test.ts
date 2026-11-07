import { describe, expect, it } from "vitest";
import { createDefaultProfile, createUnknownFacts, type Place, type PlaceType, type Region } from "../types";
import { normalizeTravelData } from "./state";
import { recommendSavedTrip, straightLineDistanceKm, validateSavedItinerarySnapshot } from "./recommend";

const now = new Date("2026-11-08T03:00:00Z");
const text = (value: string) => ({ ko: value, en: value, zh: value, ja: value });
function place(id: string, type: PlaceType = "restaurant", region: Region = "east", changes: Partial<Place> = {}): Place {
  const facts = createUnknownFacts();
  facts.operating = { value: "open", source: "official", verifiedAt: "2026-11-08" };
  return {
    id, slug: id, name: text(id), summary: text(""), address: text("제주"), district: text(region),
    type, region, lat: 33.4, lng: 126.8, image: "", price: { amount: null, unit: type === "stay" ? "night" : type === "cafe" ? "drink" : "person", petExtra: null },
    durationMinutes: null, facts, verifiedAt: null, dataMode: "live", ...changes,
  };
}

function recommend(places: Place[], options: Partial<Parameters<typeof recommendSavedTrip>[0]> = {}) {
  return recommendSavedTrip({ places, savedIds: places.map((item) => item.id), profile: createDefaultProfile(), nights: 1, now, ...options });
}

describe("saved-place regional itinerary", () => {
  it("covers four saved categories in a one-night two-day draft without inventing places", () => {
    const places = [place("meal"), place("coffee", "cafe"), place("hotel", "stay"), place("sight", "attraction")];
    const result = recommend(places);
    expect(result.method).toBe("rules");
    expect(result.tripDays).toBe(2);
    expect(result.missingTypes).toEqual([]);
    expect(result.days[0].stayPlaceId).toBe("hotel");
    expect(result.days[1].stayPlaceId).toBeNull();
    expect(Object.values(result.itinerary).flat().sort()).toEqual(places.map((item) => item.id).sort());
  });

  it("keeps a multi-night accommodation separately and preserves the stored no-duplicates contract", () => {
    const places = [place("hotel", "stay"), place("meal"), place("coffee", "cafe"), place("sight", "attraction")];
    const result = recommend(places, { nights: 2, savedIds: ["hotel", "meal", "hotel", "coffee", "sight"] });
    expect(result.days.map((day) => day.stayPlaceId)).toEqual(["hotel", "hotel", null]);
    expect(Object.values(result.itinerary).flat().filter((id) => id === "hotel")).toHaveLength(1);
    const stored = normalizeTravelData({ savedIds: places.map((item) => item.id), tripDays: 3, itinerary: result.itinerary });
    expect(stored.itinerary).toEqual(result.itinerary);
  });

  it("uses an adjacent saved stay as a two-night base instead of scheduling its region as an empty last day", () => {
    const places = [
      place("south-meal", "restaurant", "south"),
      place("south-coffee", "cafe", "south"),
      place("south-sight", "attraction", "south"),
      place("east-hotel", "stay", "east"),
    ];
    const result = recommend(places, { nights: 2 });
    expect(result.days.map((day) => day.region)).toEqual(["south", "south", "south"]);
    expect(result.days.map((day) => day.stops.length)).toEqual([1, 1, 1]);
    expect(result.days.map((day) => day.stayPlaceId)).toEqual(["east-hotel", "east-hotel", null]);
    expect(result.days.map((day) => day.stayRegion)).toEqual(["east", "east", null]);
    expect(result.itinerary[1]).toContain("east-hotel");
    expect(result.unassignedIds).toEqual([]);
    expect(result.missingTypes).toEqual([]);
  });

  it("does not let an AI ordering hint consume the final day with a hotel-only region", () => {
    const places = [place("south-meal", "restaurant", "south"), place("south-coffee", "cafe", "south"), place("south-sight", "attraction", "south"), place("east-hotel", "stay", "east")];
    const result = recommend(places, { nights: 2, options: { preferredRegionOrder: ["south", "east"] } });
    expect(result.days.every((day) => day.region === "south" && day.stops.length > 0)).toBe(true);
    expect(result.days[0].stayPlaceId).toBe("east-hotel");
    expect(result.days[1].stayPlaceId).toBe("east-hotel");
  });

  it("prefers a saved stay within the visiting region and does not substitute a stay across the island", () => {
    const places = [place("south-meal", "restaurant", "south"), place("east-hotel", "stay", "east"), place("south-hotel", "stay", "south"), place("north-hotel", "stay", "north")];
    expect(recommend(places).days[0].stayPlaceId).toBe("south-hotel");
    const oppositeOnly = recommend([places[0], places[3]]);
    expect(oppositeOnly.days[0].stayPlaceId).toBeNull();
    expect(oppositeOnly.unassignedIds).toContain("north-hotel");
    expect(oppositeOnly.warnings.some((warning) => warning.code === "no-stay-in-region")).toBe(true);
  });

  it("never promotes unsaved, fictional, closed or unknown-ID records into a real itinerary", () => {
    const closed = place("closed");
    closed.facts.operating.value = "closed";
    const places = [place("kept"), place("not-saved"), place("fiction", "stay", "east", { dataMode: "demo" }), closed];
    const result = recommend(places, { savedIds: ["kept", "fiction", "closed", "absent"] });
    expect(Object.values(result.itinerary).flat()).toEqual(["kept"]);
    expect(result.excluded).toEqual([
      { placeId: "fiction", reason: "demo" },
      { placeId: "closed", reason: "closed" },
      { placeId: "absent", reason: "missing" },
    ]);
    expect(result.missingTypes).toContain("stay");
  });

  it("enforces combined companion conditions without replacing them with regional or AI preference", () => {
    const denied = place("pet-denied");
    denied.facts.petEntry = { value: "no", source: "official", verifiedAt: "2026-11-08" };
    const stairs = place("stairs");
    stairs.facts.stepFree = { value: "no", source: "official", verifiedAt: "2026-11-08" };
    const result = recommend([denied, stairs, place("unknown")], {
      profile: { ...createDefaultProfile(), companions: ["kids", "pet", "senior"], stepFree: true },
      options: { preferredRegionOrder: ["east"] },
    });
    expect(result.excluded).toEqual([
      { placeId: "pet-denied", reason: "not-fit" },
      { placeId: "stairs", reason: "not-fit" },
    ]);
    expect(Object.values(result.itinerary).flat()).toEqual(["unknown"]);
    expect(result.days.flatMap((day) => day.requiresConfirmationIds)).toContain("unknown");
    expect(result.warnings.some((warning) => warning.code === "unverified-conditions")).toBe(true);
  });

  it("honors explicit region and category-unit budgets, including unknown prices", () => {
    const places = [
      place("outside", "cafe", "west"),
      place("expensive", "cafe", "east", { price: { amount: 9000, unit: "drink", petExtra: null } }),
      place("unknown-price", "cafe"),
      place("in-budget", "cafe", "east", { price: { amount: 6000, unit: "drink", petExtra: null } }),
      place("hotel", "stay"),
    ];
    const result = recommend(places, { profile: { ...createDefaultProfile(), regions: ["east"], budgets: { cafe: 7000 } } });
    expect(result.excluded.map((item) => item.reason)).toEqual(["region", "over-budget", "price-unknown"]);
    expect(Object.values(result.itinerary).flat().sort()).toEqual(["hotel", "in-budget"]);
  });

  it("visits neighboring regions before jumping across the island", () => {
    const places = [place("north", "attraction", "north"), place("south", "attraction", "south"), place("east", "cafe", "east")];
    const result = recommend(places, { nights: 2 });
    expect(result.days.map((day) => day.region)).toEqual(["north", "east", "south"]);
    expect(result.days.every((day) => day.stops.every(({ place: item }) => item.region === day.region))).toBe(true);
  });

  it("uses a sanitized region-order hint only among eligible saved regions", () => {
    const result = recommend([place("north", "cafe", "north"), place("east", "cafe", "east")], {
      options: { preferredRegionOrder: ["west", "east", "east", "mars" as Region, "north"] },
    });
    expect(result.days.map((day) => day.region)).toEqual(["east", "north"]);
    expect(result.method).toBe("rules");
  });

  it("does not substitute a region center for missing coordinates or claim a road travel time", () => {
    const result = recommend([place("hotel", "stay", "east", { lat: null, lng: null }), place("meal", "restaurant", "east", { lat: null, lng: null })]);
    expect(result.days[0].routeBasis).toBe("region-only");
    expect(result.days[0].straightLineKm).toBeNull();
    expect(result.warnings.some((warning) => warning.code === "missing-coordinates" && warning.placeIds.includes("hotel"))).toBe(true);
    expect(straightLineDistanceKm(place("zero", "cafe", "east", { lat: 0, lng: 0 }), place("real"))).toBeNull();
  });

  it("reports partial route data and never adds an unavailable distance as zero", () => {
    const result = recommend([place("hotel", "stay"), place("meal", "restaurant", "east", { lat: null, lng: null })]);
    expect(result.days[0].routeBasis).toBe("mixed");
    expect(result.days[0].straightLineKm).toBeNull();
  });

  it("uses real coordinates for nearest-next ordering and returns straight-line kilometers", () => {
    const near = place("near", "cafe", "east", { lat: 33.401, lng: 126.8 });
    const far = place("far", "restaurant", "east", { lat: 33.5, lng: 126.8 });
    const sight = place("sight", "attraction");
    const result = recommend([sight, far, near, place("extra1", "walk"), place("extra2", "walk"), place("extra3", "walk")]);
    expect(result.days[0].stops.map(({ place: item }) => item.id)).toEqual(["sight", "near", "far"]);
    expect(result.days[0].routeBasis).toBe("coordinates");
    expect(result.days[0].straightLineKm).toBeGreaterThan(10);
    expect(straightLineDistanceKm(sight, near)).toBeCloseTo(0.111, 2);
  });

  it("bounds nights and explicitly leaves excess saved spots unassigned", () => {
    const places = Array.from({ length: 30 }, (_, index) => place(`meal-${index}`));
    const result = recommend(places, { nights: 99 });
    expect(result.tripDays).toBe(5);
    expect(result.nights).toBe(4);
    expect(result.days.every((day) => day.stops.length <= 4)).toBe(true);
    expect(result.unassignedIds.length).toBe(10);
    expect(result.warnings.some((warning) => warning.code === "unassigned-saved-places")).toBe(true);
  });

  it("returns an honest empty draft when no real saved candidates exist", () => {
    const result = recommend([]);
    expect(result.itinerary).toEqual({});
    expect(result.days.every((day) => day.region === null && day.stayPlaceId === null)).toBe(true);
    expect(result.missingTypes).toEqual(["restaurant", "cafe", "stay", "attraction"]);
    expect(result.warnings.some((warning) => warning.code === "no-saved-places")).toBe(true);
  });
});

describe("recommended itinerary snapshot boundary", () => {
  it("rejects invented IDs, cross-day duplicates and invalid day numbers", () => {
    expect(validateSavedItinerarySnapshot({ 1: ["invented"] }, ["saved"], 2)).toBeNull();
    expect(validateSavedItinerarySnapshot({ 1: ["saved"], 2: ["saved"] }, ["saved"], 2)).toBeNull();
    expect(validateSavedItinerarySnapshot({ 3: ["saved"] }, ["saved"], 2)).toBeNull();
    expect(validateSavedItinerarySnapshot({ "01": ["saved"] }, ["saved"], 2)).toBeNull();
    expect(validateSavedItinerarySnapshot({ 1: ["saved"], 2: [] }, ["saved"], 2)).toEqual({ 1: ["saved"] });
  });
});
