import { describe, expect, it } from "vitest";
import { attractionCatalogPlaces, realPlaces } from "./catalog";
import { getPlaceFeatures } from "@/lib/place-features";

describe("VisitJeju attraction catalog", () => {
  const attractions = realPlaces.filter((place) => place.type === "attraction" || place.type === "walk");

  it("includes the full API attraction list with official photos", () => {
    expect(attractionCatalogPlaces.length).toBeGreaterThan(1200);
    expect(attractions.length).toBeGreaterThan(1250);
    const photographed = attractions.filter((place) => place.imageKind === "photo");
    expect(photographed.length / attractions.length).toBeGreaterThan(0.97);
  });

  it("keeps unique ids and slugs", () => {
    expect(new Set(realPlaces.map((place) => place.id)).size).toBe(realPlaces.length);
    expect(new Set(realPlaces.map((place) => place.slug)).size).toBe(realPlaces.length);
  });

  it("carries the API text, phone and address as observations", () => {
    const place = realPlaces.find((candidate) => candidate.name.ko === "비자림");
    expect(place?.photoSource?.photoUrl).toMatch(/photomng/);
    expect(attractionCatalogPlaces.find((candidate) => candidate.photoSource)?.photoSource?.thumbUrl).toMatch(/thumbnailpath/);
    const fields = place?.sourceObservations?.map((observation) => observation.field) ?? [];
    expect(fields).toEqual(expect.arrayContaining(["visitJejuIntro", "roadAddress"]));
    const intro = place?.sourceObservations?.find((observation) => observation.field === "visitJejuIntro");
    expect(intro?.value).toContain("천년의 세월");
  });

  it("derives facilities from official tags without turning unknown into no", () => {
    const ids = new Set(attractionCatalogPlaces.map((candidate) => candidate.id));
    const place = realPlaces.find((candidate) => ids.has(candidate.id) && candidate.amenities?.stepFree)!;
    const status = Object.fromEntries(getPlaceFeatures(place).map((feature) => [feature.key, feature.status]));
    expect(status.stepFree).toBe("yes");
    expect(Object.values(status)).not.toContain("no");
    const withoutTags = realPlaces.find((candidate) => candidate.type === "attraction" && !candidate.amenities && !candidate.facts.kidsEntry.verifiedAt);
    if (withoutTags) expect(getPlaceFeatures(withoutTags).every((feature) => feature.status === "unknown")).toBe(true);
  });
});
