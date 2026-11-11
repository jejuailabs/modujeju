import { describe, expect, it } from "vitest";
import { applyListingAmenities } from "./listing-amenities";
import { mapOfficialRecord } from "./official-catalog";
import { getPlaceFeatures } from "./place-features";
import mommom from "../../research_notes/catalog/mommom-amenities.json";
import { listingPlaces } from "@/data/catalog";
import { toPublicPlace } from "./server/place-schema";

const sourceUrl = "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_TEST";
const listingUrl = "https://mom-mom.net/travel/places/65fa3842ece865e0d93840c1";
const now = new Date("2026-11-11T03:00:00Z");
const place = () => mapOfficialRecord({
  name: "검증용 식당", address: "제주시 검증용 주소", region: "north", type: "restaurant",
  sourceUrl, sourceId: "CNTS_TEST", retrievedAt: "2026-11-11",
});
const evidence = (value: "yes" | "no" | "conditional", verifiedAt: string | null = "2026-11-11", publishedAt = "2025-04-18") =>
  ({ value, source: "listing" as const, verifiedAt, sourceUrl: listingUrl, publishedAt, quote: "맘맘 시설 항목: 아기의자, 주차" });
const file = (amenities: Record<string, unknown>) => ({
  sourceName: "맘맘", checkedAt: "2026-11-11", records: [{ sourceId: "CNTS_TEST", listingName: "검증용", amenities }],
});
const status = (p: ReturnType<typeof place>, key: string) => getPlaceFeatures(p, { now }).find(feature => feature.key === key);

describe("travel app listing facilities", () => {
  it("shows approved, dated listing facilities with their link and label kind", () => {
    const [result] = applyListingAmenities([place()], file({ highChair: evidence("yes"), strollerRental: evidence("no") }));
    const chair = status(result, "highChair");
    expect(chair?.status).toBe("yes");
    expect(chair?.evidence[0]).toMatchObject({ source: "amenity", kind: "listing", sourceUrl: listingUrl, publishedAt: "2025-04-18" });
    expect(status(result, "strollerRental")?.status).toBe("no");
  });

  it("hides listing facilities until approval, and when the listing page is older than 2025", () => {
    const [pending] = applyListingAmenities([place()], file({ highChair: evidence("yes", null) }));
    expect(status(pending, "highChair")?.status ?? "unknown").toBe("unknown");
    const [stale] = applyListingAmenities([place()], file({ highChair: evidence("yes", "2026-11-11", "2024-12-31") }));
    expect(status(stale, "highChair")?.status ?? "unknown").toBe("unknown");
  });

  it("never replaces official or phone evidence and never changes admission facts", () => {
    const original = place();
    original.amenities = { highChair: { value: "no", source: "phone", sourceUrl: listingUrl, verifiedAt: "2026-10-01" } };
    const [result] = applyListingAmenities([original], file({ highChair: evidence("yes"), parking: evidence("yes") }));
    expect(result.amenities?.highChair?.source).toBe("phone");
    expect(result.amenities?.parking?.source).toBe("listing");
    expect(result.facts).toEqual(original.facts);
  });

  it("rejects unknown places, duplicates and non-listing evidence", () => {
    expect(() => applyListingAmenities([place()], { ...file({}), records: [{ sourceId: "CNTS_OTHER", listingName: "x", amenities: {} }] })).toThrow("LISTING_AMENITIES_SOURCE_NOT_FOUND");
    const one = file({ parking: evidence("yes") }).records[0];
    expect(() => applyListingAmenities([place()], { ...file({}), records: [one, one] })).toThrow("DUPLICATE_LISTING_AMENITIES");
    expect(() => applyListingAmenities([place()], file({ parking: { ...evidence("yes"), source: "official" } }))).toThrow();
    expect(() => applyListingAmenities([place()], file({ parking: { ...evidence("yes"), publishedAt: null } }))).toThrow();
  });

  it("adds the matched spots from VisitJeju basics with photos and public records", () => {
    expect(listingPlaces.length).toBeGreaterThan(0);
    for (const place of listingPlaces) {
      expect(["restaurant", "cafe", "stay"]).toContain(place.type);
      expect(new URL(place.sourceUrl!).searchParams.get("contentsid")).toBe(place.sourceId);
      expect(place.imageKind).toBe("photo");
      expect(toPublicPlace(place)).not.toBeNull();
    }
  });

  it("keeps the shipped 맘맘 file to listing evidence with dated mom-mom.net links", () => {
    expect(mommom.records.length).toBeGreaterThan(0);
    for (const record of mommom.records) {
      for (const entry of Object.values(record.amenities) as { source: string; sourceUrl: string; publishedAt: string }[]) {
        expect(entry.source).toBe("listing");
        expect(entry.sourceUrl).toMatch(/^https:\/\/mom-mom\.net\/travel\/places\/[0-9a-f]{24}$/);
        expect(entry.publishedAt >= "2025-01-01").toBe(true);
      }
    }
  });
});
