import { describe, expect, it } from "vitest";
import { createUnknownFacts, type Place } from "../types";
import { itineraryJsonExport } from "./export";
import {
  MAX_SAVED_PLACES,
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
  tripDayDate,
} from "./state";

describe("saved travel data", () => {
  it("starts with undecided companions, regions, categories and dates", () => {
    const data = createInitialTravelData();
    expect(data.profile.companions).toEqual([]);
    expect(data.profile.regions).toEqual([]);
    expect(data.profile.types).toEqual([]);
    expect(data.tripStartDate).toBe("");
  });

  it("creates independent default objects", () => {
    const first = createInitialTravelData();
    first.profile.companions.push("pet");
    first.savedIds.push("example");
    expect(createInitialTravelData().profile.companions).toEqual([]);
    expect(createInitialTravelData().savedIds).toEqual([]);
  });

  it("round trips current saved state without a recovery warning", () => {
    const data = normalizeTravelData(
      assignPlaceToDay(createInitialTravelData(), 2, "demo-cafe"),
    );
    expect(parseTravelData(JSON.stringify(data))).toEqual({
      data,
      recovered: false,
    });
  });

  it("recovers malformed JSON without throwing", () => {
    const parsed = parseTravelData('{"profile":');
    expect(parsed.recovered).toBe(true);
    expect(parsed.data).toEqual(createInitialTravelData());
  });

  it("distinguishes a first visit from corrupted stored data", () => {
    expect(parseTravelData(null).recovered).toBe(false);
    expect(parseTravelData("null").recovered).toBe(true);
  });

  it("does not interpret an unsupported future version", () => {
    expect(
      parseTravelData('{"version":99,"savedIds":["a"]}').data.savedIds,
    ).toEqual([]);
  });

  it("migrates version zero favorites without losing a valid place", () => {
    const result = parseTravelData(
      JSON.stringify({ version: 0, favorites: ["demo-cafe"], tripDays: 2 }),
    );
    expect(result.data.savedIds).toEqual(["demo-cafe"]);
    expect(result.data.version).toBe(1);
    expect(result.recovered).toBe(true);
  });

  it("sanitizes unsupported filters and preserves a zero budget", () => {
    const profile = normalizeProfile({
      companions: ["pet", "pet", "alien"],
      regions: ["east", "east", "mars"],
      types: ["cafe", "casino"],
      budgets: { cafe: 0, stay: -1, walk: Infinity },
      stroller: "true",
      childAge: 200,
      dogWeight: 8,
      stepFree: true,
    });
    expect(profile.companions).toEqual(["pet"]);
    expect(profile.regions).toEqual(["east"]);
    expect(profile.types).toEqual(["cafe"]);
    expect(profile.budgets).toEqual({ cafe: 0 });
    expect(profile.stroller).toBe(false);
    expect(profile.childAge).toBeNull();
    expect(profile.dogWeight).toBe(8);
    expect(profile.stepFree).toBe(true);
  });

  it("removes corrupted IDs and duplicate cross-day assignments", () => {
    const data = normalizeTravelData({
      savedIds: ["a", "a", "b", "<script>", null],
      tripDays: 2,
      itinerary: { 1: ["a", "missing"], 2: ["a", "b"], 3: ["b"] },
    });
    expect(data.savedIds).toEqual(["a", "b"]);
    expect(data.itinerary).toEqual({ 1: ["a"], 2: ["b"] });
  });

  it("caps restored saved data to a bounded number of places", () => {
    const data = normalizeTravelData({
      savedIds: Array.from({ length: 300 }, (_, i) => `place-${i}`),
    });
    expect(data.savedIds).toHaveLength(MAX_SAVED_PLACES);
  });

  it("does not add a saved place beyond the limit", () => {
    const data = normalizeTravelData({
      savedIds: Array.from({ length: 200 }, (_, i) => `place-${i}`),
    });
    expect(toggleSavedPlace(data, "one-more")).toBe(data);
    expect(assignPlaceToDay(data, 1, "one-more")).toBe(data);
  });
});

describe("manual itinerary editing", () => {
  it("assigns and saves a previously unsaved place", () => {
    const data = assignPlaceToDay(createInitialTravelData(), 1, "a");
    expect(data.savedIds).toEqual(["a"]);
    expect(data.itinerary).toEqual({ 1: ["a"] });
  });

  it("moves an existing place between days without duplication", () => {
    const first = assignPlaceToDay(createInitialTravelData(), 1, "a");
    const second = assignPlaceToDay(first, 2, "a");
    expect(second.itinerary[1]).toEqual([]);
    expect(second.itinerary[2]).toEqual(["a"]);
    expect(second.savedIds).toEqual(["a"]);
    expect(first.itinerary[1]).toEqual(["a"]);
  });

  it("does not duplicate a place already assigned to the requested day", () => {
    const first = assignPlaceToDay(createInitialTravelData(), 1, "a");
    expect(assignPlaceToDay(first, 1, "a")).toBe(first);
  });

  it("rejects invalid days and invalid identifiers", () => {
    const data = createInitialTravelData();
    expect(assignPlaceToDay(data, 0, "a")).toBe(data);
    expect(assignPlaceToDay(data, 4, "a")).toBe(data);
    expect(assignPlaceToDay(data, 1.5, "a")).toBe(data);
    expect(assignPlaceToDay(data, 1, "../secret")).toBe(data);
  });

  it("removes a place from all days when it is unsaved", () => {
    const data = assignPlaceToDay(createInitialTravelData(), 1, "a");
    const removed = toggleSavedPlace(data, "a");
    expect(removed.savedIds).toEqual([]);
    expect(Object.values(removed.itinerary).flat()).not.toContain("a");
  });

  it("keeps a saved place when removing it from just the itinerary", () => {
    const data = assignPlaceToDay(createInitialTravelData(), 1, "a");
    const removed = removePlaceFromDay(data, 1, "a");
    expect(removed.savedIds).toEqual(["a"]);
    expect(removed.itinerary[1]).toEqual([]);
  });

  it("reorders places within a day without mutating the original", () => {
    let data = assignPlaceToDay(createInitialTravelData(), 1, "a");
    data = assignPlaceToDay(data, 1, "b");
    data = assignPlaceToDay(data, 1, "c");
    expect(movePlaceInDay(data, 1, "b", -1).itinerary[1]).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(movePlaceInDay(data, 1, "b", 1).itinerary[1]).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(data.itinerary[1]).toEqual(["a", "b", "c"]);
    expect(movePlaceInDay(data, 1, "a", -1)).toBe(data);
    expect(movePlaceInDay(data, 1, "c", 1)).toBe(data);
    expect(movePlaceInDay(data, 1, "unknown", 1)).toBe(data);
  });

  it("retains saved places when shortening the trip", () => {
    const data = assignPlaceToDay(createInitialTravelData(), 3, "a");
    const shortened = resizeTrip(data, 2);
    expect(shortened.tripDays).toBe(2);
    expect(shortened.itinerary[3]).toBeUndefined();
    expect(shortened.savedIds).toEqual(["a"]);
  });

  it("bounds trip length from one to five days", () => {
    const data = createInitialTravelData();
    expect(resizeTrip(data, -2).tripDays).toBe(1);
    expect(resizeTrip(data, 99).tripDays).toBe(5);
    expect(resizeTrip(data, Number.NaN)).toBe(data);
  });

  it("clears saved places and itinerary together but preserves preferences", () => {
    const data = assignPlaceToDay(createInitialTravelData(), 1, "a");
    data.profile.companions = ["pet"];
    const cleared = clearSavedPlaces(data);
    expect(cleared.savedIds).toEqual([]);
    expect(cleared.itinerary).toEqual({});
    expect(cleared.profile.companions).toEqual(["pet"]);
  });
});

describe("dates and itinerary export", () => {
  it("accepts leap dates and rejects impossible calendar dates", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2026-11-31")).toBe(false);
    expect(isIsoDate("2026-1-1")).toBe(false);
  });

  it("adds calendar days across a year boundary independently of local timezone", () => {
    expect(tripDayDate("2026-12-31", 2)).toBe("2027-01-01");
    expect(tripDayDate("", 2)).toBeNull();
    expect(tripDayDate("2026-11-07", 0)).toBeNull();
  });

  it("exports the selected language, dates, demo label and missing place IDs", () => {
    const place: Place = {
      id: "a",
      slug: "a",
      name: {
        ko: "가상 카페",
        en: "Demo cafe",
        zh: "示例咖啡馆",
        ja: "デモカフェ",
      },
      summary: { ko: "", en: "", zh: "", ja: "" },
      address: {
        ko: "가상 주소",
        en: "Demo address",
        zh: "示例地址",
        ja: "デモ住所",
      },
      district: { ko: "", en: "", zh: "", ja: "" },
      region: "east",
      type: "cafe",
      lat: 33.4,
      lng: 126.8,
      image: "/demo.png",
      price: { amount: 5000, unit: "drink", petExtra: null },
      durationMinutes: 45,
      facts: createUnknownFacts(),
      verifiedAt: null,
      dataMode: "demo",
    };
    let data = assignPlaceToDay(createInitialTravelData(), 2, "a");
    data = assignPlaceToDay(data, 2, "missing");
    data.tripStartDate = "2026-12-31";
    const result = JSON.parse(
      itineraryJsonExport(
        data,
        [place],
        "en",
        new Date("2026-11-07T00:00:00Z"),
      ),
    );
    expect(result.days[1].date).toBe("2027-01-01");
    expect(result.days[1].places[0]).toMatchObject({
      name: "Demo cafe",
      address: "Demo address",
      dataMode: "demo",
    });
    expect(result.days[1].unavailablePlaceIds).toEqual(["missing"]);
    expect(result.days[0].places).toEqual([]);
    expect(result.days[1].places[0]).not.toHaveProperty("arrivalTime");
    expect(result).not.toHaveProperty("profile");
  });
});
