import { describe, expect, it } from "vitest";
import { demoPlaces } from "@/data/places";
import { amenitiesSchema } from "@/lib/server/place-schema";
import { createUnknownFacts, type AmenityEvidence, type Fact, type Place } from "./types";
import { featureGroups, featureKeys, getCompanionFeatureRows, getFeatureSearchKeys, getPlaceFeatures, matchesPlaceFeatures, type FeatureKey } from "./place-features";

const now = new Date("2026-11-08T03:00:00Z");
const url = "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_TEST";
const blog = "https://example.com/jeju-cafe-review";
const fixture = (): Place => ({ ...structuredClone(demoPlaces[0]), dataMode: "live", facts: createUnknownFacts(), amenities: {}, sourceId: "CNTS_TEST", sourceUrl: url, basicSourceCheckedAt: "2026-11-08", sourceTags: [], sourceObservations: [], verifiedAt: null });
const fact = <T>(value: T, verifiedAt = "2026-11-08"): Fact<T> => ({ value, source: "official", verifiedAt, sourceUrl: url });
const amenity = (overrides: Partial<AmenityEvidence> = {}): AmenityEvidence => ({ value: "yes", source: "phone", verifiedAt: "2026-11-01", ...overrides });
const status = (place: Place, key: FeatureKey) => getPlaceFeatures(place, { now }).find(feature => feature.key === key)!.status;

describe("companion facility groups", () => {
  it("assigns every facility to exactly one group", () => {
    const grouped = Object.values(featureGroups).flat();
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual(featureKeys.filter(key => !["kids", "pet", "senior"].includes(key)).sort());
  });

  it("lists shoes-off floor seating as a kids facility, not a senior one", () => {
    expect(featureGroups.kids).toContain("floorSeating");
    expect(featureGroups.senior).not.toContain("floorSeating");
  });
});

describe("reviewed amenities", () => {
  it("reads a phone-verified facility with quantity and evidence", () => {
    const place = fixture();
    place.amenities = { nursingRoom: amenity(), highChair: amenity({ quantity: 2 }) };
    const highChair = getPlaceFeatures(place, { now }).find(feature => feature.key === "highChair")!;
    expect(highChair.status).toBe("yes");
    expect(highChair.quantity).toBe(2);
    expect(highChair.description.ko).toContain("2개");
    expect(highChair.evidence[0]).toMatchObject({ source: "amenity", kind: "phone", checkedAt: "2026-11-01" });
    expect(status(place, "nursingRoom")).toBe("yes");
  });

  it("keeps unknown and missing entries unknown, and explicit no as no", () => {
    const place = fixture();
    place.amenities = { ramp: amenity({ value: "unknown" }), elevator: amenity({ value: "no", quantity: 3 }) };
    expect(status(place, "ramp")).toBe("unknown");
    expect(status(place, "elevator")).toBe("no");
    expect(getPlaceFeatures(place, { now }).find(feature => feature.key === "elevator")!.quantity).toBeUndefined();
    expect(status(place, "diaperTable")).toBe("unknown");
  });

  it("requires approved, dated 2025+ HTTPS evidence for search findings", () => {
    const place = fixture();
    place.amenities = { petAmenity: amenity({ source: "search", sourceUrl: blog, publishedAt: "2026-05-12", quote: "물그릇 제공" }) };
    expect(status(place, "petAmenity")).toBe("yes");
    place.amenities.petAmenity = amenity({ source: "search", sourceUrl: blog, publishedAt: "2024-12-31" });
    expect(status(place, "petAmenity")).toBe("unknown");
    place.amenities.petAmenity = amenity({ source: "search", sourceUrl: blog, publishedAt: null });
    expect(status(place, "petAmenity")).toBe("unknown");
    place.amenities.petAmenity = amenity({ source: "search", sourceUrl: "http://example.com", publishedAt: "2026-05-12" });
    expect(status(place, "petAmenity")).toBe("unknown");
  });

  it("expires old verification and ignores demo evidence on live places", () => {
    const place = fixture();
    place.amenities = { kidsPlay: amenity({ verifiedAt: "2025-06-01" }), babyBed: amenity({ source: "demo", verifiedAt: null }) };
    expect(status(place, "kidsPlay")).toBe("unknown");
    expect(status(place, "babyBed")).toBe("unknown");
  });

  it("lets curated facts outrank amenity entries", () => {
    const place = fixture();
    place.facts.highChair = fact(false);
    place.amenities = { highChair: amenity({ quantity: 2 }) };
    expect(status(place, "highChair")).toBe("no");
  });

  it("never turns amenities into companion admission", () => {
    const place = fixture();
    place.amenities = { petRoom: amenity(), petLargeDog: amenity() };
    expect(status(place, "pet")).toBe("unknown");
  });

  it("filters with AND and conditional opt-in on new facilities", () => {
    const place = fixture();
    place.amenities = { nursingRoom: amenity(), floorSeating: amenity({ value: "conditional" }) };
    expect(matchesPlaceFeatures(place, ["nursingRoom"], { now })).toBe(true);
    expect(matchesPlaceFeatures(place, ["nursingRoom", "floorSeating"], { now })).toBe(false);
    expect(matchesPlaceFeatures(place, ["nursingRoom", "floorSeating"], { now, includeConditional: true })).toBe(true);
  });

  it("maps search aliases to the new facility keys", () => {
    expect(getFeatureSearchKeys("수유실")).toEqual(["nursingRoom"]);
    expect(getFeatureSearchKeys("신발 벗는")).toEqual(["floorSeating"]);
    expect(getFeatureSearchKeys("대형견, 펫 운동장")).toEqual(["petLargeDog", "petPlayground"]);
    expect(getFeatureSearchKeys("ramp", "en")).toEqual(["ramp"]);
  });
});

describe("companion feature rows", () => {
  it("shows a row when facilities are established even if admission is unconfirmed", () => {
    const place = fixture();
    place.amenities = { nursingRoom: amenity(), floorSeating: amenity() };
    const { rows, restricted, common } = getCompanionFeatureRows(place, { now });
    expect(rows.map(row => row.companion)).toEqual(["kids"]);
    expect(rows[0].status).toBe("unknown");
    expect(rows[0].features.map(feature => feature.key)).toEqual(["floorSeating", "nursingRoom"]);
    expect(restricted).toEqual([]);
    expect(common).toEqual([]);
  });

  it("hides empty companions and lists confirmed restrictions separately", () => {
    const place = fixture();
    place.facts.kidsEntry = fact("no");
    place.amenities = { highChair: amenity() };
    place.facts.petEntry = fact("outdoor");
    const { rows, restricted } = getCompanionFeatureRows(place, { now });
    expect(restricted).toEqual(["kids"]);
    expect(rows.map(row => row.companion)).toEqual(["pet"]);
    expect(rows[0]).toMatchObject({ status: "conditional", highlight: "outdoor", features: [] });
  });

  it("orders confirmed before conditional and can exclude conditional", () => {
    const place = fixture();
    place.amenities = { ramp: amenity({ value: "conditional" }), elevator: amenity() };
    expect(getCompanionFeatureRows(place, { now }).rows[0].features.map(feature => feature.key)).toEqual(["elevator", "ramp"]);
    expect(getCompanionFeatureRows(place, { now, includeConditional: false }).rows[0].features.map(feature => feature.key)).toEqual(["elevator"]);
  });

  it("returns nothing for a place without established information", () => {
    expect(getCompanionFeatureRows(fixture(), { now })).toEqual({ rows: [], restricted: [], common: [] });
  });
});

describe("amenity schema", () => {
  it("accepts reviewed entries and rejects undated search evidence or unknown keys", () => {
    expect(amenitiesSchema.safeParse({ nursingRoom: amenity() }).success).toBe(true);
    expect(amenitiesSchema.safeParse({ petAmenity: amenity({ source: "search", sourceUrl: blog }) }).success).toBe(false);
    expect(amenitiesSchema.safeParse({ kids: amenity() }).success).toBe(false);
    expect(amenitiesSchema.safeParse({ ramp: amenity({ quantity: 0 }) }).success).toBe(false);
  });
});
