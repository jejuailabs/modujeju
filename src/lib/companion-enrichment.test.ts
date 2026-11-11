import { describe, expect, it } from "vitest";
import { applyCompanionEnrichment } from "./companion-enrichment";
import { mapOfficialRecord } from "./official-catalog";
import { toPublicPlace } from "./server/place-schema";

const sourceUrl = "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_TEST";
const place = () => mapOfficialRecord({
  name: "검증용 장소", address: "제주시 검증용 주소", region: "north", type: "stay",
  sourceUrl, sourceId: "CNTS_TEST", retrievedAt: "2026-11-08",
  observations: [{ field: "petPolicy", value: "이전 안내", sourceUrl }],
  admissions: { pet: { value: "indoor", maxWeightKg: 10, weightInclusive: false, sourceUrl, verifiedAt: "2026-11-08" } },
});
const reviewed = {
  sourceId: "CNTS_TEST",
  observations: [{ field: "petPolicy", value: "출처 간 체중 기준이 달라 예약 전 확인 필요", sourceUrl: "https://operator.example/pets", verifiedAt: "2026-11-08" }],
  clearFactKeys: ["dogMaxWeight", "dogWeightInclusive"],
};

describe("companion research merge", () => {
  it("replaces superseded notes and clears conflicting limits without changing identity or the original snapshot", () => {
    const original = place();
    const [result] = applyCompanionEnrichment([original], [reviewed]);
    expect(result.sourceObservations).toEqual(reviewed.observations);
    expect(result.facts.dogMaxWeight.value).toBe("unknown");
    expect(result.facts.dogWeightInclusive.value).toBe("unknown");
    expect(result.facts.petEntry).toEqual(original.facts.petEntry);
    expect(result.id).toBe(original.id);
    expect(original.facts.dogMaxWeight.value).toBe(10);
    expect(original.sourceObservations?.[0].value).toBe("이전 안내");
    expect(toPublicPlace(result)?.sourceObservations).toEqual(reviewed.observations);
  });

  it("requires an existing unique content ID and valid public evidence", () => {
    expect(() => applyCompanionEnrichment([place()], [reviewed, reviewed])).toThrow("DUPLICATE_COMPANION_ENRICHMENT");
    expect(() => applyCompanionEnrichment([place()], [{ ...reviewed, sourceId: "CNTS_OTHER" }])).toThrow("COMPANION_ENRICHMENT_SOURCE_NOT_FOUND");
    expect(() => applyCompanionEnrichment([place()], [{ ...reviewed, observations: [{ ...reviewed.observations[0], sourceUrl: "javascript:alert(1)" }] }])).toThrow();
    expect(() => applyCompanionEnrichment([place()], [{ ...reviewed, clearFactKeys: ["madeUpFact"] }])).toThrow();
  });

  it("does not turn pending research into admission facts, and preserves approved condition notes", () => {
    const note = { ko: "지정 공간에서만 이용", en: "Designated areas only", zh: "仅限指定区域", ja: "指定エリアのみ" };
    const patch = { sourceId: "CNTS_TEST", observations: [], admissions: { kids: { value: "conditional", sourceUrl, verifiedAt: null, note } } };
    const [pending] = applyCompanionEnrichment([place()], [patch]);
    expect(pending.facts.kidsEntry.value).toBe("unknown");
    const [approved] = applyCompanionEnrichment([place()], [{ ...patch, admissions: { kids: { ...patch.admissions.kids, verifiedAt: "2026-11-08" } } }]);
    expect(approved.facts.kidsEntry.note).toEqual(note);
    expect(approved.facts.kidsEntry.value).toBe("conditional");
    expect(toPublicPlace(approved)?.facts.kidsEntry.note).toEqual(note);
  });

  it("keeps newer facility evidence when supplemental evidence is pending, older or future-dated", () => {
    const original = place();
    original.amenities = { nursingRoom: { value: "yes", source: "official", sourceUrl, verifiedAt: "2026-11-07" } };
    for (const verifiedAt of [null, "2025-01-01", "2027-01-01"]) {
      const [result] = applyCompanionEnrichment([original], [{
        sourceId: "CNTS_TEST", observations: [],
        amenities: { nursingRoom: { value: "no", source: "official", sourceUrl, verifiedAt } },
      }], new Date("2026-11-08T03:00:00Z"));
      expect(result.amenities).toEqual(original.amenities);
    }
  });
});
