import { describe, expect, it } from "vitest";
import companionSpots from "../../research_notes/catalog/companion-spots.json";
import companionPhotos from "../../research_notes/catalog/companion-photos.json";
import { mapOfficialCatalog } from "@/lib/official-catalog";
import { applyCatalogPhotos } from "@/lib/catalog-photos";
import { getCompanionFeatureRows, getPlaceFeatures } from "@/lib/place-features";
import { toPublicPlace } from "@/lib/server/place-schema";
import { basePlaces, companionPlaces, attractionCatalogPlaces, listingPlaces, outingPlaces, publicSourcePlaces, realPlaces } from "./catalog";

const now = new Date("2026-11-08T03:00:00Z");
const banned = /(naver\.com|naver\.me|kakao\.com|tistory\.com|daum\.net|google\.)/i;
type Evidence = { verifiedAt: string | null; sourceUrl: string; source?: string; publishedAt?: string | null };
const evidenceOf = (record: (typeof companionSpots)[number]): Evidence[] => [
  ...Object.values((record as { amenities?: Record<string, Evidence> }).amenities ?? {}),
  ...Object.values((record as { admissions?: Record<string, Evidence> }).admissions ?? {}),
];

describe("companion research spots", () => {
  it("adds VisitJeju-identified dining and lodging spots without duplicating the base catalog", () => {
    expect(companionPlaces.length).toBe(companionSpots.length);
    expect(companionPlaces.length).toBeGreaterThan(0);
    expect(realPlaces).toHaveLength(basePlaces.length + companionPlaces.length + outingPlaces.length + listingPlaces.length + publicSourcePlaces.length + attractionCatalogPlaces.length);
    expect(new Set(realPlaces.map(place => place.id)).size).toBe(realPlaces.length);
    for (const place of companionPlaces) {
      expect(["restaurant", "cafe", "stay"]).toContain(place.type);
      expect(new URL(place.sourceUrl!).hostname).toBe("www.visitjeju.net");
      expect(new URL(place.sourceUrl!).searchParams.get("contentsid")).toBe(place.sourceId);
      // VisitJeju spells addresses several ways (제주특별자치도 / 제주도 / 제주시 …).
      expect(place.address.ko).toMatch(/^(?:제주|서귀포)/);
      expect(toPublicPlace(place)).not.toBeNull();
    }
  });

  it("shows the observed VisitJeju photo for every spot that has one", () => {
    const withPhoto = companionPlaces.filter(place => place.photoSource);
    expect(withPhoto).toHaveLength(companionPhotos.length);
    for (const place of withPhoto) expect(place.image).toMatch(/^https:\/\/api\.cdn\.visitjeju\.net\/photomng\//);
  });

  it("keeps evidence on allowed, dated sources", () => {
    for (const record of companionSpots) {
      for (const evidence of evidenceOf(record)) {
        expect(evidence.sourceUrl).toMatch(/^https:\/\//);
        expect(evidence.sourceUrl).not.toMatch(banned);
        if (evidence.source === "search") expect(evidence.publishedAt! >= "2025-01-01").toBe(true);
        if (evidence.verifiedAt !== null) expect(evidence.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("hides pending evidence and shows it once approved", () => {
    const pending = structuredClone(companionSpots).map(record => {
      for (const evidence of evidenceOf(record)) evidence.verifiedAt = null;
      return record;
    });
    const hidden = applyCatalogPhotos(mapOfficialCatalog(pending), companionPhotos);
    for (const place of hidden) {
      expect(getCompanionFeatureRows(place, { now }).rows).toEqual([]);
      expect(place.facts.petEntry.value).toBe("unknown");
    }
    const approved = structuredClone(companionSpots).map(record => {
      for (const evidence of evidenceOf(record)) evidence.verifiedAt = "2026-11-08";
      return record;
    });
    const shown = applyCatalogPhotos(mapOfficialCatalog(approved), companionPhotos);
    for (const place of shown) {
      const established = getPlaceFeatures(place, { now }).filter(feature => feature.status === "yes" || feature.status === "conditional");
      expect(established.length).toBeGreaterThan(0);
    }
  });
});
