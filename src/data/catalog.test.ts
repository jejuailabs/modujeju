import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import cafes from "../../research_notes/catalog/cafes.json";
import restaurants from "../../research_notes/catalog/restaurants.json";
import stays from "../../research_notes/catalog/stays.json";
import { locales, regions } from "@/lib/types";
import { realPlaces } from "./catalog";

const researched = [...restaurants, ...cafes, ...stays];

function trustedSource(value: string | undefined): URL {
  expect(value).toBeTruthy();
  const url = new URL(value!);
  expect(url.protocol).toBe("https:");
  expect(["visitjeju.net", "www.visitjeju.net"]).toContain(url.hostname);
  expect(url.username).toBe("");
  expect(url.password).toBe("");
  return url;
}

describe("researched Jeju catalog integration", () => {
  it("publishes all 60 researched records with 20 per category", () => {
    expect(researched).toHaveLength(60);
    expect(realPlaces).toHaveLength(60);
    for (const type of ["restaurant", "cafe", "stay"]) {
      expect(researched.filter((place) => place.type === type)).toHaveLength(
        20,
      );
      expect(realPlaces.filter((place) => place.type === type)).toHaveLength(
        20,
      );
    }
    expect(new Set(realPlaces.map((place) => place.sourceId))).toEqual(
      new Set(researched.map((place) => place.sourceId)),
    );
  });

  it("covers all four regions and keeps Jocheon consistently in the east", () => {
    expect(new Set(realPlaces.map((place) => place.region))).toEqual(
      new Set(regions),
    );
    const jocheon = realPlaces.filter((place) =>
      place.address.ko.includes("조천읍"),
    );
    expect(jocheon.length).toBeGreaterThan(0);
    expect(jocheon.every((place) => place.region === "east")).toBe(true);
  });

  it("keeps distinct identities without collapsing businesses at a shared address", () => {
    for (const key of ["id", "slug", "sourceId"] as const) {
      expect(new Set(realPlaces.map((place) => place[key])).size).toBe(60);
    }
    expect(new Set(realPlaces.map((place) => place.name.ko)).size).toBe(60);
    const sharedAddress = realPlaces.filter((place) =>
      place.address.ko.includes("안덕면 신화역사로304번길 38"),
    );
    expect(sharedAddress.length).toBeGreaterThan(1);
    expect(new Set(sharedAddress.map((place) => place.id)).size).toBe(
      sharedAddress.length,
    );
  });

  it("retains observed names, addresses and trusted source IDs for every listing", () => {
    const originals = new Map(
      researched.map((place) => [place.sourceId, place]),
    );
    for (const place of realPlaces) {
      const original = originals.get(place.sourceId!);
      expect(original).toBeDefined();
      expect(place.name.ko).toBe(original!.name);
      expect(place.address.ko).toBe(original!.address);
      expect(
        trustedSource(place.sourceUrl).searchParams.get("contentsid"),
      ).toBe(place.sourceId);
      expect(place.dataMode).toBe("live");
      expect(place.basicSourceCheckedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const locale of locales) {
        expect(place.name[locale].trim()).not.toBe("");
        expect(place.address[locale].trim()).not.toBe("");
        expect(place.district[locale].trim()).not.toBe("");
      }
    }
  });

  it("does not turn promotions or missing measurements into confirmed prices or coordinates", () => {
    for (const place of realPlaces) {
      expect(place.price.amount).toBeNull();
      expect(place.price.petExtra).toBeNull();
      expect(place.lat).toBeNull();
      expect(place.lng).toBeNull();
      expect(place.durationMinutes).toBeNull();
    }
  });

  it("uses existing category placeholders without presenting sample photos as real places", () => {
    for (const place of realPlaces) {
      expect(place.imageKind).toBe("placeholder");
      expect(place.image).toBe(`/assets/icons/catalog-${place.type}.svg`);
      expect(
        existsSync(resolve(process.cwd(), "public", place.image.slice(1))),
      ).toBe(true);
    }
  });

  it("exposes source notes as readable text and keeps joined tags out of the catalog", () => {
    for (const place of realPlaces) {
      for (const tag of place.sourceTags ?? []) {
        expect(tag).not.toMatch(/[，,]/);
        expect(tag.trim()).not.toBe("");
      }
      for (const note of place.sourceObservations ?? []) {
        expect(typeof note.value).toBe("string");
        expect(note.value.trim()).not.toBe("");
        expect(note.value).not.toBe("[object Object]");
        trustedSource(note.sourceUrl);
      }
    }
    const honeymoon = realPlaces.find(
      (place) => place.name.ko === "허니문하우스",
    );
    expect(
      honeymoon?.sourceObservations?.some((note) =>
        note.value.includes("유아의자"),
      ),
    ).toBe(true);
    const sonobel = realPlaces.find((place) => place.name.ko === "소노벨제주");
    expect(
      sonobel?.sourceObservations?.some((note) =>
        note.value.includes("펫프렌들리"),
      ),
    ).toBe(true);
  });
});
