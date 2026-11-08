import { describe, expect, it } from "vitest";
import { mapOfficialCatalog, mapOfficialRecord } from "./official-catalog";
import { filterAndSortPlaces } from "./catalog";
import { createDefaultProfile } from "./types";
import { itineraryJsonExport } from "./trip/export";
import { assignPlaceToDay, createInitialTravelData } from "./trip/state";

const observed = {
  name: "공식 목록의 장소", address: "제주시 관측된 주소", region: "north", type: "cafe",
  sourceUrl: "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_TEST",
  sourceTags: ["반려동물", "무료", "주차장"], retrievedAt: "2026-11-08T00:00:00Z",
  observations: [{ field: "pet", value: true, quote: "반려동물 태그" }],
};

describe("official observed catalog", () => {
  it("retains original listing information and marks basic source observation separately", () => {
    const place = mapOfficialRecord(observed);
    expect(place.id).toBe("vj-CNTS_TEST");
    expect(place.sourceId).toBe("CNTS_TEST");
    expect(place.name.ko).toBe(observed.name);
    expect(place.name.en).toBe(observed.name);
    expect(place.address.ko).toBe(observed.address);
    expect(place.basicSourceCheckedAt).toBe("2026-11-08");
    expect(place.sourceName).toBe("VisitJeju");
    expect(place.dataMode).toBe("live");
  });
  it("never infers eligibility, prices or measurements from listing tags and observations", () => {
    const place = mapOfficialRecord(observed);
    expect(place.lat).toBeNull(); expect(place.lng).toBeNull();
    expect(place.durationMinutes).toBeNull();
    expect(place.price.amount).toBeNull(); expect(place.price.petExtra).toBeNull();
    expect(place.verifiedAt).toBeNull();
    expect(Object.values(place.facts).every((fact) => fact.value === "unknown" && fact.verifiedAt === null)).toBe(true);
    expect(place.sourceTags).toEqual(observed.sourceTags);
  });
  it("uses explicit category placeholders instead of representative fake photographs", () => {
    for (const type of ["cafe", "restaurant", "stay"]) {
      const place = mapOfficialRecord({ ...observed, type });
      expect(place.imageKind).toBe("placeholder");
      expect(place.image).toBe(`/assets/icons/catalog-${type}.svg`);
    }
  });
  it("requires reviewed region mapping and rejects invalid observation dates", () => {
    expect(() => mapOfficialRecord({ ...observed, region: undefined })).toThrow();
    expect(() => mapOfficialRecord({ ...observed, retrievedAt: "2026-02-31" })).toThrow();
  });
  it("exposes string source observations separately without promoting them to eligibility facts", () => {
    const place = mapOfficialRecord({ ...observed, observations: [{ field: "childrenAccess", value: "어린이 출입가능" }, { field: "pet", value: true }] });
    expect(place.sourceObservations).toEqual([{ field: "childrenAccess", value: "어린이 출입가능", sourceUrl: observed.sourceUrl }]);
    expect(place.facts.kidsEntry.value).toBe("unknown");
    expect(place.facts.petEntry.value).toBe("unknown");
  });
  it("rejects duplicate source records instead of giving cards duplicate IDs", () => {
    expect(() => mapOfficialCatalog([observed, observed])).toThrow("DUPLICATE_OFFICIAL_LISTING");
  });
  it("places unknown duration after observed duration and searches source tags", () => {
    const unknown = mapOfficialRecord(observed);
    const known = { ...unknown, id: "known", durationMinutes: 45 };
    const sorted = filterAndSortPlaces([unknown, known], createDefaultProfile(), { sort: "duration" });
    expect(sorted.map(({ place }) => place.id)).toEqual(["known", unknown.id]);
    expect(filterAndSortPlaces([unknown], createDefaultProfile(), { query: "무료" })).toHaveLength(1);
    // Companion aliases now search established conditions, not unverified tags.
    expect(filterAndSortPlaces([unknown], createDefaultProfile(), { query: "반려동물" })).toHaveLength(0);
  });
  it("exports unknown coordinates as null without invented map locations", () => {
    const place = mapOfficialRecord(observed);
    const trip = assignPlaceToDay(createInitialTravelData(), 1, place.id);
    const exported = JSON.parse(itineraryJsonExport(trip, [place]));
    expect(exported.days[0].places[0]).toMatchObject({ latitude: null, longitude: null, dataMode: "live" });
  });

  it("turns only approved admission evidence into companion facts", () => {
    const src = "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_TEST";
    const pending = mapOfficialRecord({ ...observed, admissions: { pet: { value: "indoor", maxWeightKg: 10, weightInclusive: true, sourceUrl: src, verifiedAt: null } } });
    expect(pending.facts.petEntry.value).toBe("unknown");
    expect(pending.facts.dogMaxWeight.value).toBe("unknown");
    const approved = mapOfficialRecord({ ...observed, admissions: {
      pet: { value: "indoor", maxWeightKg: 10, weightInclusive: true, sourceUrl: src, verifiedAt: "2026-11-08" },
      kids: { value: "no", sourceUrl: src, verifiedAt: "2026-11-08" },
    } });
    expect(approved.facts.petEntry).toEqual({ value: "indoor", source: "official", verifiedAt: "2026-11-08", sourceUrl: src });
    expect(approved.facts.dogMaxWeight.value).toBe(10);
    expect(approved.facts.dogWeightInclusive.value).toBe(true);
    expect(approved.facts.carrierRequired.value).toBe("unknown");
    expect(approved.facts.kidsEntry.value).toBe("no");
    expect(approved.facts.stepFree.value).toBe("unknown");
  });
  it("rejects malformed admission evidence", () => {
    expect(() => mapOfficialRecord({ ...observed, admissions: { pet: { value: "inside", sourceUrl: "https://example.com", verifiedAt: null } } })).toThrow();
    expect(() => mapOfficialRecord({ ...observed, admissions: { kids: { value: "yes", sourceUrl: "http://example.com", verifiedAt: null } } })).toThrow();
  });
});
