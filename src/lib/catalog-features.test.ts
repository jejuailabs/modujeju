import { describe, expect, it } from "vitest";
import { realPlaces } from "@/data/catalog";
import { filterAndSortPlaces } from "./catalog";
import { createDefaultProfile, createUnknownFacts } from "./types";

const now = new Date("2026-11-08T03:00:00Z");
const profile = createDefaultProfile();

describe("catalog facility search integration", () => {
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
