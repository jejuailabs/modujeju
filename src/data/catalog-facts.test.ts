import { describe, expect, it } from "vitest";
import cafes from "../../research_notes/catalog/cafes.json";
import restaurants from "../../research_notes/catalog/restaurants.json";
import stays from "../../research_notes/catalog/stays.json";
import { mapOfficialCatalog } from "../lib/official-catalog";
import { createDefaultProfile, type Place } from "../lib/types";
import { evaluatePlace } from "../lib/verdict/evaluate";
import { applyCatalogFacts } from "./catalog-facts";

const raw = [...cafes, ...restaurants, ...stays];
const catalog = () => applyCatalogFacts(mapOfficialCatalog(raw));
const find = (id: string, places = catalog()): Place => places.find(place => place.sourceId === id)!;
const now = new Date("2026-11-07T19:00:00Z"); // 2026-11-08 in Jeju.
const petProfile = { ...createDefaultProfile(), companions: ["pet"] as const };

describe("manually reviewed official companion facts", () => {
  it("applies explicit child admission values without interpreting the no-kids field name as a ban", () => {
    const places = catalog();
    expect(places.filter(place => place.facts.kidsEntry.value === "yes")).toHaveLength(8);
    expect(find("CNTS_000000000019940", places).facts.kidsEntry.value).toBe("yes");
    expect(find("CNTS_000000000019945", places).facts.kidsEntry.value).toBe("no");
    expect(places.filter(place => place.facts.kidsEntry.value === "no")).toHaveLength(1);
  });

  it("does not treat an adults-only pool zone as a whole-venue child ban", () => {
    expect(find("CNTS_000000000019250").facts.kidsEntry.value).toBe("unknown");
  });

  it("does not infer child admission from family tags or hotel play facilities", () => {
    expect(catalog().filter(place => place.type === "stay").every(place => place.facts.kidsEntry.value === "unknown")).toBe(true);
  });

  it("distinguishes an explicit high chair from infant utensils and vague infant services", () => {
    const places = catalog();
    expect(find("CNTS_200000000009011", places).facts.highChair.value).toBe(true);
    expect(find("CNTS_200000000007548", places).facts.highChair.value).toBe("unknown");
    expect(places.filter(place => place.facts.highChair.value === true)).toHaveLength(1);
  });

  it("excludes all three explicitly pet-prohibited stays for a pet companion", () => {
    for (const id of ["CNTS_200000000007373", "CNTS_000000000020590", "CNTS_200000000007548"]) {
      const place = find(id);
      expect(place.facts.petEntry.value).toBe("no");
      expect(evaluatePlace(place, { ...petProfile, companions: [...petProfile.companions] }, now).verdict).toBe("notFit");
    }
  });

  it("preserves the difference between under 10 kg and up to 12 kg", () => {
    const somerset = find("CNTS_000000000022768");
    const sonocalm = find("CNTS_000000000020789");
    expect(somerset.facts.dogMaxWeight.value).toBe(10);
    expect(somerset.facts.dogWeightInclusive.value).toBe(false);
    expect(sonocalm.facts.dogMaxWeight.value).toBe(12);
    expect(sonocalm.facts.dogWeightInclusive.value).toBe(true);
  });

  it("keeps designated-room policies unknown for general admission and carries booking restrictions", () => {
    for (const id of ["CNTS_000000000022768", "CNTS_000000000020789", "CNTS_000000000000592"]) {
      const place = find(id);
      expect(place.facts.petEntry.value).toBe("unknown");
      expect(place.facts.petEntry.note?.ko).toContain("객실");
      expect(place.facts.petEntry.note?.ko).toContain("예약");
      expect(evaluatePlace(place, { ...petProfile, companions: [...petProfile.companions], dogWeight: 3, indoorPet: true }, now).verdict).toBe("unknown");
    }
  });

  it("does not invent an inclusive weight bound from a dog-size category label", () => {
    const place = find("CNTS_000000000000592");
    expect(place.facts.dogMaxWeight.value).toBe("unknown");
    expect(place.facts.dogWeightInclusive.value).toBe("unknown");
  });

  it("does not convert pet-welcome wording or conditional indoor use into indoor admission", () => {
    expect(catalog().every(place => !["indoor", "outdoor"].includes(place.facts.petEntry.value))).toBe(true);
    expect(find("CONT_000000000501154").facts.petEntry.note?.ko).toContain("알레르기");
    expect(find("CNTS_000000000019242").facts.petEntry.note?.ko).toContain("실내·야외 이용 범위");
  });

  it("keeps operations, age, stroller and step-free access unconfirmed when source wording does not establish them", () => {
    for (const place of catalog()) {
      for (const key of ["operating", "minAge", "stroller", "stepFree", "walkingMinutes", "carrierRequired"] as const) {
        expect(place.facts[key].value).toBe("unknown");
        expect(place.facts[key].verifiedAt).toBeNull();
      }
    }
  });

  it("records a store car park without treating a generic public car park as on-site", () => {
    expect(find("CNTS_000000000020104").facts.parking.value).toBe("onsite");
    expect(find("CNTS_200000000009011").facts.parking.value).toBe("unknown");
  });

  it("keeps promotional hotel rates out of public observations and confirmed price fields", () => {
    const mapped = catalog();
    expect(stays.some(place => place.observations.some(observation => observation.field === "nightlyPricePromotionDisplayed"))).toBe(true);
    expect(mapped.every(place => place.price.amount === null && place.price.petExtra === null)).toBe(true);
    expect(mapped.every(place => !place.sourceObservations?.some(observation => observation.field === "nightlyPricePromotionDisplayed"))).toBe(true);
    expect(find("CNTS_000000000022768", mapped).sourceObservations?.find(observation => observation.field === "facilityPriceDisplayed")?.value).toContain("객실 숙박요금이 아니며");
  });

  it("retains readable hotel observations and their original structured research values", () => {
    expect(stays.every(place => place.observations.every(observation => typeof observation.value === "string"))).toBe(true);
    const original = stays.find(place => place.sourceId === "CNTS_000000000022768")!;
    expect(original.observations.find(observation => observation.field === "accessibleRoomDisplayed")?.valueStructured).toBe(true);
    const place = find(original.sourceId);
    expect(place.sourceObservations?.find(observation => observation.field === "kidsFacilitiesDisplayed")?.value).toContain("유모차 대여");
    expect(place.sourceObservations?.find(observation => observation.field === "accessibleRoomDisplayed")?.value).toContain("장애인 전용 객실");
    expect(place.sourceObservations?.find(observation => observation.field === "petPolicyDisplayed")?.value).toContain("10kg 미만");
  });

  it("uses the KST page-wording review date only for individual reviewed facts", () => {
    for (const place of catalog()) {
      expect(place.verifiedAt).toBeNull();
      for (const fact of Object.values(place.facts)) {
        if (fact.source !== "official") continue;
        expect(fact.verifiedAt).toBe("2026-11-08");
        expect(new URL(fact.sourceUrl!).searchParams.get("contentsid")).toBe(place.sourceId);
        expect(fact.note?.ko).toContain("공식 페이지 문구 확인");
        for (const locale of ["ko", "en", "zh", "ja"] as const) expect(fact.note?.[locale]).toContain("2026-11-08");
      }
    }
  });

  it("does not mutate mapper output or its fact objects", () => {
    const base = mapOfficialCatalog(raw);
    const before = structuredClone(base);
    applyCatalogFacts(base);
    expect(base).toEqual(before);
  });

  it("preserves subsequent editorial, phone and on-site evidence, including an explicit unknown", () => {
    for (const source of ["official", "phone", "onsite"] as const) {
      const place = find("CNTS_200000000009011", mapOfficialCatalog(raw));
      place.facts.kidsEntry = { value: "no", source, verifiedAt: "2026-11-09" };
      place.facts.highChair = { value: "unknown", source, verifiedAt: "2026-11-09" };
      const result = applyCatalogFacts([place])[0];
      expect(result.facts.kidsEntry).toEqual(place.facts.kidsEntry);
      expect(result.facts.highChair).toEqual(place.facts.highChair);
    }
  });

  it("does not apply trusted facts to an untrusted domain, a mismatched source ID, a wrong category or demo data", () => {
    const base = find("CNTS_200000000009011", mapOfficialCatalog(raw));
    for (const patch of [
      { sourceUrl: "https://visitjeju.net.example.com/kr/detail/view?contentsid=CNTS_200000000009011" },
      { sourceUrl: "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_000000000019945" },
      { type: "stay" as const },
      { dataMode: "demo" as const },
    ]) {
      const result = applyCatalogFacts([{ ...base, ...patch }])[0];
      expect(result.facts.kidsEntry.value).toBe("unknown");
      expect(result.facts.highChair.value).toBe("unknown");
    }
  });

  it("preserves KST basic-listing dates, conservative administrative districts and split source tags", () => {
    expect(stays.every(place => place.basicSourceCheckedAt === "2026-11-08")).toBe(true);
    expect(stays.every(place => place.district && !place.sourceTags.some(tag => tag.includes("，")))).toBe(true);
    expect(find("CNTS_000000000018141").district.ko).toBe("서귀포시");
    expect(find("CNTS_200000000007048").district.ko).toBe("제주시 회천동");
  });
});
