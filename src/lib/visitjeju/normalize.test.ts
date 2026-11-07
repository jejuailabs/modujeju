import { describe, expect, it } from "vitest";
import {
  normalizeVisitJejuRecord,
  plainText,
  safePhotoUrl,
  visitJejuLocale,
} from "./normalize";

const source = {
  contentsid: "CNTS_123",
  title: "<b>샘플 여행지</b>",
  introduction: "<script>alert(1)</script>바다 &amp; 산책",
  roadaddress: "제주시 샘플로 10",
  latitude: 33.4,
  longitude: 126.5,
  region2cd: { label: "애월" },
  repPhoto: { photoid: { imgpath: "https://api.cdn.visitjeju.net/photo.png" } },
  alltag: "반려동물,장애인화장실,무료", // A tag is not verified policy or a verified zero price.
};
const options = {
  region: "west" as const,
  type: "attraction" as const,
  retrievedAt: "2026-11-07T00:00:00Z",
};

describe("VisitJeju draft normalization", () => {
  it("leaves all companion facts unknown despite favorable tags", () => {
    const draft = normalizeVisitJejuRecord(source, options);
    expect(
      Object.values(draft.place.facts).every(
        (fact) => fact.value === "unknown" && fact.verifiedAt === null,
      ),
    ).toBe(true);
    expect(draft.status).toBe("draft");
  });
  it("does not treat unknown prices as free", () => {
    expect(
      normalizeVisitJejuRecord(source, options).place.price.amount,
    ).toBeNull();
  });
  it("keeps the retrieval date separate from verification", () => {
    const { place } = normalizeVisitJejuRecord(source, options);
    expect(place.retrievedAt).toBe(options.retrievedAt);
    expect(place.verifiedAt).toBeNull();
    expect(place.sourceUpdatedAt).toBeNull();
  });
  it("keeps upstream pictures unpublished until rights review", () => {
    const draft = normalizeVisitJejuRecord(source, options);
    expect(draft.candidatePhotoUrl).toBe(
      "https://api.cdn.visitjeju.net/photo.png",
    );
    expect(draft.place.image).toBe("/assets/icons/map-pin.svg");
  });
  it("cleans HTML and does not invent translations", () => {
    const { place } = normalizeVisitJejuRecord(source, options);
    expect(place.name.ko).toBe("샘플 여행지");
    expect(place.summary.ko).toBe("바다 & 산책");
    expect(place.name.ja).toBe(place.name.ko);
  });
  it("rejects out-of-Jeju coordinates but keeps unobserved coordinates null", () => {
    expect(() =>
      normalizeVisitJejuRecord({ ...source, latitude: 37.5 }, options),
    ).toThrow("VISITJEJU_INVALID_RECORD");
    const { place } = normalizeVisitJejuRecord({ ...source, longitude: undefined }, options);
    expect(place.lat).toBeNull();
    expect(place.lng).toBeNull();
    expect(place.durationMinutes).toBeNull();
    expect(place.imageKind).toBe("placeholder");
    expect(place.sourceTags).toContain("반려동물");
  });
  it("rejects source IDs that can form unsafe document paths", () => {
    expect(() =>
      normalizeVisitJejuRecord({ ...source, contentsid: "../secret" }, options),
    ).toThrow();
  });
  it("rejects remote image URLs outside official hosts", () => {
    expect(safePhotoUrl("https://evil.example/photo.png")).toBeNull();
    expect(safePhotoUrl("http://api.cdn.visitjeju.net/photo.png")).toBeNull();
    expect(
      safePhotoUrl("https://user:pass@api.cdn.visitjeju.net/photo.png"),
    ).toBeNull();
  });
  it("maps application locale codes explicitly", () => {
    expect(visitJejuLocale).toEqual({ ko: "kr", en: "en", zh: "cn", ja: "jp" });
  });
  it("limits imported source strings", () => {
    expect(plainText("a".repeat(5000), 120)).toHaveLength(120);
  });

  it("keeps stable identities across title, tag and region changes", () => {
    const before = normalizeVisitJejuRecord(source, options).place;
    const after = normalizeVisitJejuRecord({ ...source, title: "변경 상호", alltag: "새 태그" }, { ...options, region: "east" }).place;
    expect(after.id).toBe(before.id);
    expect(after.slug).toBe(before.slug);
    expect(after.sourceTags).toEqual(["새 태그"]);
    expect(after.sourceTags).not.toContain("반려동물");
  });

  it("rejects truncatable or transformed IDs instead of aliasing a different source", () => {
    for (const contentsid of ["A".repeat(96), "<b>CNTS_123</b>", "CNTS-123", "cnts_123", " CNTS_123"]) {
      expect(() => normalizeVisitJejuRecord({ ...source, contentsid }, options)).toThrow("VISITJEJU_INVALID_RECORD");
    }
    expect(normalizeVisitJejuRecord({ ...source, contentsid: "A".repeat(95) }, options).place.id).toHaveLength(98);
  });

  it("does not coerce arrays, objects or non-decimal coordinate strings into locations", () => {
    for (const latitude of [[33.4], { valueOf: () => 33.4 }, "0x21", true]) {
      expect(() => normalizeVisitJejuRecord({ ...source, latitude }, options)).toThrow("VISITJEJU_INVALID_RECORD");
    }
    expect(normalizeVisitJejuRecord({ ...source, latitude: "33.4" }, options).place.lat).toBe(33.4);
    expect(normalizeVisitJejuRecord({ ...source, latitude: " " }, options).place.lat).toBeNull();
  });

  it("keeps source summaries brief and does not infer update dates from undocumented properties", () => {
    const { place, reviewWarnings } = normalizeVisitJejuRecord({ ...source, introduction: "안내 ".repeat(300), updatedAt: "2026-11-06", modifiedtime: "20261106" }, options);
    expect(place.summary.ko.length).toBeLessThanOrEqual(240);
    expect(place.sourceUpdatedAt).toBeNull();
    expect(reviewWarnings).toContain("SOURCE_UPDATE_DATE_UNAVAILABLE");
  });

  it("deduplicates official tag tokens and retains both documented tag fields", () => {
    const { place } = normalizeVisitJejuRecord({ ...source, alltag: "카페，주차장,카페", tag: "풍경#카페" }, options);
    expect(place.sourceTags).toEqual(["카페", "주차장", "풍경"]);
    expect(place.facts.parking.value).toBe("unknown");
  });

  it("uses the Korean retrieval calendar date without declaring policy verification", () => {
    const { place } = normalizeVisitJejuRecord(source, { ...options, retrievedAt: "2026-11-07T15:00:00Z" });
    expect(place.basicSourceCheckedAt).toBe("2026-11-08");
    expect(place.verifiedAt).toBeNull();
    expect(place.facts.operating.verifiedAt).toBeNull();
  });

  it("does not trust upstream claims of image rights or publish a newly supplied image", () => {
    const { place, candidatePhotoUrl, reviewWarnings } = normalizeVisitJejuRecord({ ...source, imageRights: { status: "approved" }, license: "CC0" }, options);
    expect(place.imageKind).toBe("placeholder");
    expect(place.image).not.toBe(candidatePhotoUrl);
    expect(reviewWarnings).toContain("IMAGE_RIGHTS_UNVERIFIED");
    expect(safePhotoUrl("https://api.cdn.visitjeju.net:8443/photo.png")).toBeNull();
  });
});
