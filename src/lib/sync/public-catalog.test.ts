import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createUnknownFacts, type Place } from "@/lib/types";
import { mergeSourcedCatalog } from "./public-catalog";

const text = { ko: "공식 장소", en: "공식 장소", zh: "공식 장소", ja: "공식 장소" };
const place: Place = { id: "vj-A", slug: "vj-a", name: text, summary: text, address: text, district: text, region: "north", type: "restaurant", lat: null, lng: null, image: "/assets/icons/map-pin.svg", price: { amount: null, unit: "person", petExtra: null }, durationMinutes: null, facts: createUnknownFacts(), sourceId: "A", sourceUrl: "https://www.visitjeju.net/kr/detail/view?contentsid=A", verifiedAt: null, dataMode: "live" };

describe("source catalog with editorial overlays", () => {
  it("shows new sourced records even while their editorial record is a draft", () => {
    const result = mergeSourcedCatalog([{ eligible: true, place, sourceHash: "private-internal-hash" }], [{ ...place, status: "draft", internalNotes: "private-notes" }]);
    expect(result).toHaveLength(1); expect(result[0].facts.petEntry.value).toBe("unknown");
    expect(JSON.stringify(result)).not.toMatch(/private-internal-hash|private-notes/);
  });
  it("uses published reviews for policy, price and authorized pictures", () => {
    const verified = { ...place, status: "published", price: { amount: 12000, unit: "person", petExtra: null }, image: "https://photos.example/authorized.jpg", imageKind: "photo", facts: { ...place.facts, kidsEntry: { value: "no", source: "phone", verifiedAt: "2026-11-08" } } };
    const result = mergeSourcedCatalog([{ eligible: true, place }], [verified]);
    expect(result[0].facts.kidsEntry.value).toBe("no"); expect(result[0].price.amount).toBe(12000); expect(result[0].imageKind).toBe("photo");
  });
  it.each(["hidden", "suspended", "closed"])("gives %s overrides priority regardless of source presence", (status) => {
    expect(mergeSourcedCatalog([{ eligible: true, place }], [{ ...place, status }])).toEqual([]);
    expect(mergeSourcedCatalog([{ eligible: true, place }], [{ ...place, status }, { ...place, status: "published" }])).toEqual([]);
  });
  it("includes independent published records and excludes unpublished editorial records", () => {
    expect(mergeSourcedCatalog([], [{ ...place, status: "published" }])).toHaveLength(1);
    expect(mergeSourcedCatalog([], [{ ...place, status: "draft" }])).toEqual([]);
  });
  it("still honors a hidden editorial document matched by place ID when sourceId is missing", () => {
    const withoutSourceId = { ...place }; delete withoutSourceId.sourceId;
    expect(mergeSourcedCatalog([{ eligible: true, place }], [{ ...withoutSourceId, status: "hidden" }])).toEqual([]);
  });
  it("does not expose injected verification or photo claims from the source collection", () => {
    const result = mergeSourcedCatalog([{ eligible: true, place: { ...place, image: "https://unreviewed.example/photo.jpg", imageKind: "photo", price: { amount: 0, unit: "person", petExtra: 0 }, facts: { ...place.facts, kidsEntry: { value: "yes", source: "official", verifiedAt: "2026-11-08" } } } }], []);
    expect(result[0].facts.kidsEntry.value).toBe("unknown"); expect(result[0].price.amount).toBeNull(); expect(result[0].imageKind).toBe("placeholder");
  });
});
