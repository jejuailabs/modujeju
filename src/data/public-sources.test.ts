import { describe, expect, it } from "vitest";
import enrichment from "../../research_notes/catalog/public-source-enrichment.json";
import { publicSourcePlaces, realPlaces } from "./catalog";
import { toPublicPlace } from "@/lib/server/place-schema";

type Evidence = { source?: string; sourceUrl: string; verifiedAt: string | null; value: string };
const hosts = new Set(["easyjeju.net", "www.foodsafetykorea.go.kr", "www.visitjeju.net"]);

describe("public companion sources (이지제주, 식품안전나라, 비짓제주 반려 태그)", () => {
  it("adds matched VisitJeju spots with photos and valid public records", () => {
    expect(publicSourcePlaces.length).toBeGreaterThan(0);
    for (const place of publicSourcePlaces) {
      expect(["restaurant", "cafe", "stay"]).toContain(place.type);
      expect(new URL(place.sourceUrl!).searchParams.get("contentsid")).toBe(place.sourceId);
      expect(toPublicPlace(place)).not.toBeNull();
    }
  });

  it("keeps every patch to the three public hosts and to official evidence", () => {
    const ids = new Set(realPlaces.map(place => place.sourceId));
    for (const record of enrichment as unknown as { sourceId: string; amenities?: Record<string, Evidence>; admissions?: Record<string, Evidence> }[]) {
      expect(ids.has(record.sourceId)).toBe(true);
      for (const entry of Object.values(record.amenities ?? {})) {
        expect(entry.source).toBe("official");
        expect(hosts.has(new URL(entry.sourceUrl).hostname)).toBe(true);
      }
      for (const entry of Object.values(record.admissions ?? {})) {
        expect(hosts.has(new URL(entry.sourceUrl).hostname)).toBe(true);
      }
    }
  });

  it("shows VisitJeju API text for listed places and never publishes 010 mobile numbers", () => {
    const withIntro = realPlaces.filter(place => place.sourceObservations?.some(o => o.field === "visitJejuIntro"));
    expect(withIntro.length).toBeGreaterThan(400);
    for (const place of realPlaces) {
      for (const observation of place.sourceObservations ?? []) {
        if (observation.field === "visitJejuPhone") expect(observation.value.replace(/\s/g, "")).not.toMatch(/^010/);
      }
    }
  });

  it("never marks a pet-tag-only place as confirmed indoor entry", () => {
    for (const record of enrichment as unknown as { amenities?: Record<string, Evidence>; admissions?: { pet?: Evidence } }[]) {
      const pet = record.admissions?.pet;
      if (pet) expect(new URL(pet.sourceUrl).hostname).toBe("www.foodsafetykorea.go.kr");
      const welcome = record.amenities?.petWelcome;
      if (welcome && new URL(welcome.sourceUrl).hostname === "www.visitjeju.net") expect(welcome.value).toBe("conditional");
    }
  });
});
