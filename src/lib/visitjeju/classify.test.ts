import { describe, expect, it } from "vitest";
import { classifyVisitJejuRecord, VisitJejuClassificationError } from "./classify";
import { isVisitJejuNormalizationError, normalizeClassifiedVisitJejuRecord } from "./normalize";

// Synthetic unit inputs, not captured API responses. V1.1 supplies the nested
// value/label/refId shape, but does not document food/lodging numeric codes.
const category = (label: string) => ({ value: "synthetic", label, refId: "contentscd>synthetic" });
const record = {
  contentsid: "CNTS_123",
  title: "시험용 장소",
  roadaddress: "제주특별자치도 제주시 조천읍 시험로 1",
  contentscd: category("음식점"),
  region1cd: { value: "region1", label: "제주시", refId: "region>region1" },
  region2cd: { value: "15", label: "조천", refId: "region1>15" },
  tag: "한식,흑돼지",
};

describe("evidence-limited VisitJeju classification", () => {
  it("uses the official food label and reviewed region code", () => {
    expect(classifyVisitJejuRecord(record)).toMatchObject({ ok: true, type: "restaurant", region: "east" });
  });

  it("uses the exact cafe tag within the food category", () => {
    expect(classifyVisitJejuRecord({ ...record, tag: "풍경, 카페 ,휴식" })).toMatchObject({ ok: true, type: "cafe", categoryBasis: "official-label-and-cafe-tag" });
    expect(classifyVisitJejuRecord({ ...record, alltag: "주차장，카페" })).toMatchObject({ ok: true, type: "cafe" });
  });

  it("does not infer a cafe from the venue name or a partial tag", () => {
    expect(classifyVisitJejuRecord({ ...record, title: "카페 옆 식당", tag: "카페거리,북카페인근" })).toMatchObject({ ok: true, type: "restaurant" });
  });

  it("keeps a stay classified as a stay when it also has a cafe tag", () => {
    expect(classifyVisitJejuRecord({ ...record, contentscd: category("숙박"), alltag: "카페,가족호텔" })).toMatchObject({ ok: true, type: "stay" });
  });

  it("does not invent code-only food or lodging mappings", () => {
    expect(classifyVisitJejuRecord({ ...record, contentscd: { value: "c4", label: "", refId: "contentscd>c4" } })).toMatchObject({ ok: false });
    expect(classifyVisitJejuRecord({ ...record, contentscd: category("unknown") })).toEqual({ ok: false, reason: "VISITJEJU_CATEGORY_UNMAPPED" });
  });

  it("classifies the documented c1 attraction without interpreting companion tags as conditions", () => {
    // Actual code/label/refId relationships from V1.1 pages 5-7.
    expect(classifyVisitJejuRecord({ ...record,
      contentscd: { value: "c1", label: "관광지", refId: "contentscd>c1" },
      region1cd: { value: "region2", label: "서귀포시", refId: "region>region2" },
      region2cd: { value: "17", label: "성산", refId: "region2>17" },
      tag: "카페,반려동물동반_관광지,무장애관광",
    })).toEqual({ ok: true, type: "attraction", region: "east", categoryBasis: "official-label", regionCode: "17" });
    expect(classifyVisitJejuRecord({ ...record, contentscd: category("관광지") })).toEqual({ ok: false, reason: "VISITJEJU_CATEGORY_UNMAPPED" });
  });

  it("quarantines a contradiction of the documented c1 category", () => {
    expect(classifyVisitJejuRecord({ ...record, contentscd: { value: "c1", label: "음식점", refId: "contentscd>c1" } })).toEqual({ ok: false, reason: "VISITJEJU_CLASSIFICATION_CONFLICT" });
  });

  it("does not guess categories from familiar titles, tags or unsupported translated labels", () => {
    for (const label of ["호텔", "음식", "Restaurant", "음식점/숙박"]) {
      expect(classifyVisitJejuRecord({ ...record, contentscd: category(label), tag: "카페,호텔" })).toMatchObject({ ok: false });
    }
  });

  it("rejects malformed category shape and mismatched reference IDs", () => {
    for (const contentscd of [null, "음식점", [], { value: "synthetic", label: "음식점" }]) {
      expect(classifyVisitJejuRecord({ ...record, contentscd })).toEqual({ ok: false, reason: "VISITJEJU_INVALID_CLASSIFICATION" });
    }
    expect(classifyVisitJejuRecord({ ...record, contentscd: { ...category("음식점"), refId: "region>synthetic" } })).toEqual({ ok: false, reason: "VISITJEJU_CLASSIFICATION_CONFLICT" });
  });

  it("maps all reviewed mainland regions and Udo without a citywide fallback", () => {
    const cases = [
      ["region1", "제주시", "11", "제주시내", "north"], ["region1", "제주시", "12", "애월", "west"],
      ["region1", "제주시", "13", "한림", "west"], ["region1", "제주시", "14", "한경", "west"],
      ["region1", "제주시", "15", "조천", "east"], ["region1", "제주시", "16", "구좌", "east"],
      ["region2", "서귀포시", "17", "성산", "east"], ["region2", "서귀포시", "21", "서귀포시내", "south"],
      ["region2", "서귀포시", "22", "대정", "west"], ["region2", "서귀포시", "23", "안덕", "south"],
      ["region2", "서귀포시", "24", "중문", "south"], ["region2", "서귀포시", "25", "남원", "south"],
      ["region2", "서귀포시", "26", "표선", "east"], ["region3", "섬 속의 섬", "31", "우도", "east"],
    ];
    for (const [parent, parentLabel, value, label, region] of cases) {
      expect(classifyVisitJejuRecord({ ...record,
        region1cd: { value: parent, label: parentLabel, refId: `region>${parent}` },
        region2cd: { value, label, refId: `${parent}>${value}` },
      })).toMatchObject({ ok: true, region });
    }
    expect(classifyVisitJejuRecord({ ...record, region2cd: undefined })).toMatchObject({ ok: false });
  });

  it("quarantines unassigned islands or future region codes even when the address looks familiar", () => {
    for (const value of ["32", "33", "34", "35", "36", "999"]) {
      expect(classifyVisitJejuRecord({ ...record, region2cd: { value, label: "새 구역", refId: `region1>${value}` } })).toEqual({ ok: false, reason: "VISITJEJU_REGION_UNMAPPED" });
    }
  });

  it("requires district code, Korean label and parent reference to agree", () => {
    for (const region2cd of [
      { value: "15", label: "애월", refId: "region1>15" },
      { value: "15", label: "조천", refId: "region2>15" },
      { value: "17", label: "성산", refId: "region1>17" },
    ]) expect(classifyVisitJejuRecord({ ...record, region2cd })).toEqual({ ok: false, reason: "VISITJEJU_CLASSIFICATION_CONFLICT" });
  });

  it("normalizes classified drafts while preserving unknown policies and image review", () => {
    const draft = normalizeClassifiedVisitJejuRecord({ ...record, tag: "카페,반려동물동반입장,무료" }, { retrievedAt: "2026-11-07T19:00:00Z" });
    expect(draft.place.type).toBe("cafe");
    expect(draft.place.region).toBe("east");
    expect(draft.place.basicSourceCheckedAt).toBe("2026-11-08");
    expect(draft.place.price.amount).toBeNull();
    expect(Object.values(draft.place.facts).every(fact => fact.value === "unknown")).toBe(true);
    expect(draft.status).toBe("draft");
  });

  it("exports stable reject codes without swallowing unexpected programming failures", () => {
    expect(() => normalizeClassifiedVisitJejuRecord({}, { retrievedAt: "2026-11-08" })).toThrow(VisitJejuClassificationError);
    expect(isVisitJejuNormalizationError(new VisitJejuClassificationError("VISITJEJU_REGION_UNMAPPED"))).toBe(true);
    expect(isVisitJejuNormalizationError(new Error("VISITJEJU_INVALID_RECORD"))).toBe(true);
    expect(isVisitJejuNormalizationError(new Error("INVALID_RETRIEVAL_DATE"))).toBe(true);
    expect(isVisitJejuNormalizationError(new TypeError("bug"))).toBe(false);
  });

  it("normalizes attractions as unpublished drafts with unverified companion facilities", () => {
    const draft = normalizeClassifiedVisitJejuRecord({ ...record,
      contentscd: { value: "c1", label: "관광지", refId: "contentscd>c1" },
      tag: "무장애관광,반려동물동반가능,아이",
    }, { retrievedAt: "2026-11-08T00:00:00Z" });
    expect(draft.place.type).toBe("attraction");
    expect(draft.status).toBe("draft");
    expect(draft.place.price.unit).toBe("person");
    expect(draft.place.price.amount).toBeNull();
    expect(Object.values(draft.place.facts).every((fact) => fact.value === "unknown" && fact.verifiedAt === null)).toBe(true);
  });
});
