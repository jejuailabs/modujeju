import { describe, expect, it } from "vitest";
import { basePlaces as realPlaces } from "@/data/catalog";
import { filterAndSortPlaces } from "./catalog";
import { createDefaultProfile, createUnknownFacts } from "./types";
import { getPlaceFeatures } from "./place-features";
import { mapOfficialRecord } from "./official-catalog";
import { placeSchema } from "./server/place-schema";
import attractions from "../../research_notes/catalog/attractions.json";

const now = new Date("2026-11-08T03:00:00Z");
const profile = createDefaultProfile();

describe("catalog facility search integration", () => {
  it("never promotes undated attraction observations using the basic listing date", () => {
    const tourism = realPlaces.filter((place) => place.type === "attraction");
    expect(tourism).toHaveLength(6);
    for (const place of tourism) {
      const publicPlace = placeSchema.parse(place);
      expect(publicPlace.basicSourceCheckedAt).toBe("2026-11-08");
      expect(publicPlace.sourceObservations?.every((observation) => observation.verifiedAt === null)).toBe(true);
      expect(getPlaceFeatures(publicPlace, { now }).every((feature) => feature.status === "unknown")).toBe(true);
    }
    expect(filterAndSortPlaces(tourism, profile, { features: ["toilet"], now })).toHaveLength(0);
    const source = attractions.find((place) => place.name === "천지연폭포")!;
    for (const verifiedAt of [null, "2024-12-31", "invalid"]) {
      const place = mapOfficialRecord({ ...source, observations: [{ field: "amenities", value: "화장실", verifiedAt }] });
      expect(getPlaceFeatures(place, { now }).find((feature) => feature.key === "toilet")?.status).toBe("unknown");
    }
    const reviewed = mapOfficialRecord({ ...source, observations: [{ field: "amenities", value: "화장실", verifiedAt: "2026-11-01" }] });
    expect(getPlaceFeatures(reviewed, { now }).find((feature) => feature.key === "toilet")).toMatchObject({
      status: "yes", evidence: [{ checkedAt: "2026-11-01", source: "observation" }],
    });
  });

  it("finds the confirmed high chair and does not let unverified tags or names bypass the feature query", () => {
    const fake = { ...structuredClone(realPlaces[0]), id: "unverified-chair", facts: createUnknownFacts(), name: { ko: "유아의자", en: "High chair", zh: "儿童餐椅", ja: "ベビーチェア" }, sourceTags: ["유아의자"], sourceObservations: [] };
    const result = filterAndSortPlaces([...realPlaces, fake], profile, { query: "유아의자", now });
    expect(result).toHaveLength(1);
    expect(result[0].place.name.ko).toBe("허니문하우스");
  });

  it("returns three explicitly first-floor venues while leaving inaccessible-floor questions separate", () => {
    expect(filterAndSortPlaces(realPlaces, profile, { features: ["groundFloor"], now })).toHaveLength(3);
    expect(filterAndSortPlaces(realPlaces, profile, { features: ["groundFloor", "stepFree"], now })).toHaveLength(0);
  });

  it("applies selected features and exact alias searches together with AND", () => {
    expect(filterAndSortPlaces(realPlaces, profile, { features: ["highChair"], query: "화장실", now })).toHaveLength(1);
    expect(filterAndSortPlaces(realPlaces, profile, { features: ["highChair", "floorSeating"], now })).toHaveLength(0);
  });

  it("keeps ordinary place-name and source-tag search available", () => {
    expect(filterAndSortPlaces(realPlaces, profile, { query: "허니문", now })).toHaveLength(1);
    const place = { ...structuredClone(realPlaces[0]), sourceTags: ["테스트풍경"], facts: createUnknownFacts() };
    expect(filterAndSortPlaces([place], profile, { query: "테스트풍경", now })).toHaveLength(1);
  });

  it("includes conditional pet rooms only when explicitly requested and never admits unknown pet tags", () => {
    const strict = filterAndSortPlaces(realPlaces, profile, { features: ["pet"], now });
    const conditional = filterAndSortPlaces(realPlaces, profile, { features: ["pet"], includeConditionalFeatures: true, now });
    expect(strict).toHaveLength(0);
    expect(conditional).toHaveLength(2);
    expect(filterAndSortPlaces(realPlaces, profile, { query: "반려견", includeConditionalFeatures: true, now }).map(match => match.place.id)).toEqual(conditional.map(match => match.place.id));
  });

  it("does not let conditional facility inclusion override the whole-party exclusion", () => {
    const place = structuredClone(realPlaces.find(place => place.sourceId === "CNTS_000000000022768")!);
    place.facts.kidsEntry = { value: "no", source: "official", verifiedAt: "2026-11-08" };
    expect(filterAndSortPlaces([place], { ...profile, companions: ["kids", "pet"] }, { features: ["pet"], includeConditionalFeatures: true, now })).toHaveLength(0);
  });
});
