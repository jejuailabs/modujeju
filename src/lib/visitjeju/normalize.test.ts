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
});
