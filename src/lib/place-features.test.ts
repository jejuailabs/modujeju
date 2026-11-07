import { describe, expect, it } from "vitest";
import { realPlaces } from "@/data/catalog";
import { demoPlaces } from "@/data/places";
import { createUnknownFacts, type Fact, type Place } from "./types";
import { featureKeys, getFeatureSearchKeys, getPlaceFeatures, matchesFeatureSearch, matchesPlaceFeatures, type FeatureKey } from "./place-features";

const now = new Date("2026-11-08T03:00:00Z");
const url = "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_TEST";
const fixture = (): Place => ({ ...structuredClone(demoPlaces[0]), dataMode: "live", facts: createUnknownFacts(), sourceId: "CNTS_TEST", sourceUrl: url, basicSourceCheckedAt: "2026-11-08", sourceTags: [], sourceObservations: [], verifiedAt: null });
const fact = <T>(value: T, verifiedAt = "2026-11-08"): Fact<T> => ({ value, source: "official", verifiedAt, sourceUrl: url });
const feature = (place: Place, key: FeatureKey) => getPlaceFeatures(place, { now }).find(feature => feature.key === key)!;
const observe = (place: Place, field: string, value: string, sourceUrl = url) => { place.sourceObservations!.push({ field, value, sourceUrl }); return place; };

describe("evidence-based facility features", () => {
  it("returns every feature with localized labels, status and descriptions", () => {
    const features = getPlaceFeatures(fixture(), { now });
    expect(features.map(feature => feature.key)).toEqual(featureKeys);
    expect(features.every(feature => feature.status === "unknown")).toBe(true);
    for (const feature of features) for (const locale of ["ko", "en", "zh", "ja"] as const) {
      expect(feature.label[locale]).toBeTruthy(); expect(feature.description[locale]).toBeTruthy();
    }
  });

  it("keeps unknown distinct from an explicit false and rejects missing verification", () => {
    const place = fixture();
    place.facts.highChair = fact(false);
    expect(feature(place, "highChair").status).toBe("no");
    place.facts.highChair = { value: true, source: "unknown", verifiedAt: null };
    expect(feature(place, "highChair").status).toBe("unknown");
  });

  it("does not let source tags or attractive summary wording become facilities", () => {
    const place = fixture();
    place.sourceTags = ["유아의자", "반려동물", "무장애관광", "1층"];
    place.summary.ko = "1층의 펫 카페, 유아 의자와 편안한 좌식";
    expect(getPlaceFeatures(place, { now }).every(feature => feature.status === "unknown")).toBe(true);
  });

  it("reads the exact high-chair facility token but not infant utensils or a negative phrase", () => {
    expect(feature(observe(fixture(), "infantFacilities", "유아의자"), "highChair").status).toBe("yes");
    expect(feature(observe(fixture(), "infantFacilities", "유아 식기"), "highChair").status).toBe("unknown");
    expect(feature(observe(fixture(), "infantFacilities", "유아의자 없음"), "highChair").status).toBe("no");
  });

  it("requires source identity and a recent real observation date", () => {
    const place = observe(fixture(), "infantFacilities", "유아의자", "https://www.visitjeju.net/kr/detail/view?contentsid=OTHER");
    expect(feature(place, "highChair").status).toBe("unknown");
    place.sourceObservations![0].sourceUrl = url;
    place.basicSourceCheckedAt = "2025-01-01";
    expect(feature(place, "highChair").status).toBe("unknown");
    place.basicSourceCheckedAt = undefined;
    expect(feature(place, "highChair").status).toBe("unknown");
  });

  it("keeps explicit conflicting observations unconfirmed", () => {
    const place = observe(observe(fixture(), "infantFacilities", "유아의자"), "infantFacilities", "유아의자 없음");
    expect(feature(place, "highChair").status).toBe("unknown");
    expect(feature(place, "highChair").evidence).toHaveLength(2);
  });

  it("preserves authoritative curated facts over raw facility observations", () => {
    const place = observe(fixture(), "infantFacilities", "유아의자");
    place.facts.highChair = { value: false, source: "phone", verifiedAt: "2026-11-08" };
    expect(feature(place, "highChair").status).toBe("no");
  });

  it("distinguishes floor, chair and mixed seating", () => {
    const place = fixture();
    place.facts.seating = fact("floor");
    expect(feature(place, "floorSeating").status).toBe("yes");
    expect(feature(place, "tableSeating").status).toBe("no");
    place.facts.seating = fact("mixed");
    expect(feature(place, "floorSeating").status).toBe("conditional");
    expect(feature(place, "tableSeating").status).toBe("conditional");
    place.facts.seating = fact("notApplicable");
    expect(feature(place, "floorSeating").status).toBe("unknown");
  });

  it("only accepts exact seating observations in the seating field", () => {
    expect(feature(observe(fixture(), "좌석", "좌식"), "floorSeating").status).toBe("yes");
    expect(feature(observe(fixture(), "본문", "좌식"), "floorSeating").status).toBe("unknown");
    expect(feature(observe(fixture(), "좌석", "일부 좌식일 수 있음"), "floorSeating").status).toBe("unknown");
  });

  it("accepts a standalone first-floor address suffix without implying step-free access", () => {
    const place = fixture();
    place.address.ko = "제주특별자치도 서귀포시 천제연로 192, 1층";
    expect(feature(place, "groundFloor").status).toBe("yes");
    expect(feature(place, "groundFloor").evidence[0].source).toBe("address");
    expect(feature(place, "stepFree").status).toBe("unknown");
    expect(feature(place, "senior").status).toBe("unknown");
  });

  it("does not interpret basement, ranges, mixed floors or unit numbers as ground-floor use", () => {
    for (const suffix of ["지하 1층", "지하1층", "1~2층", "1층/2층", "1층, 2층", "2층 및 1층", "11층", "101호", "1층 출입구"]) {
      const place = fixture(); place.address.ko = `제주시 시험로 10 ${suffix}`;
      expect(feature(place, "groundFloor").status, suffix).toBe("unknown");
    }
  });

  it("keeps first-floor observations unknown when they conflict with the address", () => {
    const place = observe(fixture(), "층수", "2층"); place.address.ko = "제주시 시험로 10 1층";
    expect(feature(place, "groundFloor").status).toBe("unknown");
    expect(feature(observe(fixture(), "층수", "1~2층"), "groundFloor").status).toBe("unknown");
  });

  it("uses only step-free evidence for senior mobility information", () => {
    const place = observe(fixture(), "listedAccessibilityFacilities", "엘리베이터");
    place.facts.seating = fact("table");
    expect(feature(place, "senior").status).toBe("unknown");
    place.facts.stepFree = fact("yes");
    expect(feature(place, "senior").status).toBe("yes");
    expect(feature(place, "senior").description.ko).toContain("좌석과 보행 시간은 별도로");
  });

  it("does not infer stroller admission from stroller rental", () => {
    expect(feature(observe(fixture(), "kidsFacilitiesDisplayed", "유모차 대여 서비스"), "stroller").status).toBe("unknown");
  });

  it("does not infer short walking time from the overall visit duration", () => {
    const place = fixture(); place.durationMinutes = 15;
    expect(feature(place, "shortWalk").status).toBe("unknown");
    place.facts.walkingMinutes = fact(30);
    expect(feature(place, "shortWalk").status).toBe("yes");
    place.facts.walkingMinutes = fact(31);
    expect(feature(place, "shortWalk").status).toBe("no");
  });

  it("makes pet weight boundaries, outdoor areas and carriers conditional", () => {
    const place = fixture(); place.facts.petEntry = fact("indoor"); place.facts.dogMaxWeight = fact(8); place.facts.dogWeightInclusive = fact(false); place.facts.carrierRequired = fact(true);
    const result = feature(place, "pet");
    expect(result.status).toBe("conditional"); expect(result.description.ko).toContain("미만"); expect(result.description.ko).toContain("이동장");
    place.facts.dogMaxWeight = fact(null); place.facts.carrierRequired = fact(false);
    expect(feature(place, "pet").status).toBe("yes");
    place.facts.petEntry = fact("outdoor");
    expect(feature(place, "pet").status).toBe("conditional");
  });

  it("keeps age-restricted admission conditional", () => {
    const place = fixture(); place.facts.kidsEntry = fact("yes"); place.facts.minAge = fact(8);
    expect(feature(place, "kids").status).toBe("conditional");
  });

  it("expires old evidence and never reuses demo evidence for a live place", () => {
    const place = fixture(); place.facts.highChair = fact(true, "2025-01-01");
    expect(feature(place, "highChair").status).toBe("unknown");
    place.facts.highChair = { value: true, source: "demo", verifiedAt: null };
    expect(feature(place, "highChair").status).toBe("unknown");
    place.dataMode = "demo";
    expect(feature(place, "highChair").status).toBe("yes");
  });

  it("combines selected features with AND and requires an explicit conditional opt-in", () => {
    const place = fixture(); place.facts.highChair = fact(true); place.facts.parking = fact("nearby");
    expect(matchesPlaceFeatures(place, [], { now })).toBe(true);
    expect(matchesPlaceFeatures(place, ["highChair", "parking"], { now })).toBe(false);
    expect(matchesPlaceFeatures(place, ["highChair", "parking"], { now, includeConditional: true })).toBe(true);
    expect(matchesPlaceFeatures(place, ["highChair", "stepFree"], { now, includeConditional: true })).toBe(false);
  });

  it("matches localized exact aliases and requires positive evidence for feature search", () => {
    const place = fixture(); place.sourceTags = ["유아의자"];
    expect(getFeatureSearchKeys("유아 의자")).toEqual(["highChair"]);
    expect(getFeatureSearchKeys("high chair", "en")).toEqual(["highChair"]);
    expect(getFeatureSearchKeys("座敷", "ja")).toEqual(["floorSeating"]);
    expect(matchesFeatureSearch(place, "유아의자", "ko", { now })).toBe(false);
    place.facts.highChair = fact(true);
    expect(matchesFeatureSearch(place, "유아의자", "ko", { now })).toBe(true);
    expect(getFeatureSearchKeys("유아의자,주차장")).toEqual(["highChair", "parking"]);
    expect(getFeatureSearchKeys("제주 바다")).toEqual([]);
  });

  it("derives real snapshot features without inventing seating or friendly claims", () => {
    expect(realPlaces.filter(place => feature(place, "highChair").status === "yes")).toHaveLength(1);
    expect(realPlaces.filter(place => feature(place, "groundFloor").status === "yes")).toHaveLength(3);
    expect(realPlaces.every(place => feature(place, "floorSeating").status === "unknown")).toBe(true);
    expect(realPlaces.every(place => feature(place, "senior").status === "unknown")).toBe(true);
  });

  it("describes the two reviewed pet-room offers conditionally while keeping admission facts unknown", () => {
    for (const id of ["CNTS_000000000022768", "CNTS_000000000020789"]) {
      const place = realPlaces.find(place => place.sourceId === id)!;
      expect(feature(place, "pet").status).toBe("conditional");
      expect(feature(place, "pet").description.ko).toContain("객실");
      expect(place.facts.petEntry.value).toBe("unknown");
      expect(matchesPlaceFeatures(place, ["pet"], { now })).toBe(false);
      expect(matchesFeatureSearch(place, "반려견", "ko", { now, includeConditional: true })).toBe(true);
    }
  });
});
