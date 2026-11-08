import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import cafes from "../../research_notes/catalog/cafes.json";
import restaurants from "../../research_notes/catalog/restaurants.json";
import stays from "../../research_notes/catalog/stays.json";
import attractions from "../../research_notes/catalog/attractions.json";
import coordinates from "../../research_notes/catalog/coordinates.json";
import photos from "../../research_notes/catalog/photos.json";
import { catalogPhotoSchema } from "@/lib/catalog-photos";
import { applyCatalogCoordinates } from "@/lib/catalog-coordinates";
import { toPublicPlace } from "@/lib/server/place-schema";
import { categoryPlaceholder } from "@/lib/official-catalog";
import { locales, regions } from "@/lib/types";
import { basePlaces as realPlaces } from "./catalog";

const researched = [...restaurants, ...cafes, ...stays, ...attractions];

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
  it("publishes the researched dining, lodging and attraction records", () => {
    expect(researched).toHaveLength(66);
    expect(realPlaces).toHaveLength(66);
    for (const type of ["restaurant", "cafe", "stay"]) {
      expect(researched.filter((place) => place.type === type)).toHaveLength(
        20,
      );
      expect(realPlaces.filter((place) => place.type === type)).toHaveLength(
        20,
      );
    }
    expect(realPlaces.filter((place) => place.type === "attraction")).toHaveLength(6);
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
      expect(new Set(realPlaces.map((place) => place[key])).size).toBe(researched.length);
    }
    expect(new Set(realPlaces.map((place) => place.name.ko)).size).toBe(researched.length);
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
      if (!place.coordinateSource) {
        expect(place.lat).toBeNull();
        expect(place.lng).toBeNull();
      }
      expect(place.durationMinutes).toBeNull();
    }
  });

  it("publishes four reviewed coordinates with provenance and rejects mismatched identities", () => {
    const located = realPlaces.filter((place) => place.coordinateSource);
    expect(located).toHaveLength(4);
    expect(realPlaces.filter((place) => place.lat === null && place.lng === null)).toHaveLength(62);
    for (const place of located) {
      const reviewed = coordinates.find((record) => record.sourceId === place.sourceId)!;
      expect([place.lat, place.lng]).toEqual([reviewed.lat, reviewed.lng]);
      expect(toPublicPlace(place)?.coordinateSource).toEqual(reviewed.coordinateSource);
      expect(place.coordinateSource?.kind).toBe("place-center");
      expect(place.verifiedAt).toBeNull();
    }
    expect(() => applyCatalogCoordinates([{ ...located[0], name: { ...located[0].name, ko: "다른 장소" } }], coordinates)).toThrow("COORDINATE_IDENTITY_MISMATCH");
    expect(() => applyCatalogCoordinates([{ ...located[0], address: { ...located[0].address, ko: "다른 주소" } }], coordinates)).toThrow("COORDINATE_IDENTITY_MISMATCH");
  });

  it("uses the observed official photo for its exact source, otherwise a category placeholder", () => {
    const observedPhotos = photos.map((photo) => catalogPhotoSchema.parse(photo));
    expect(observedPhotos).toHaveLength(realPlaces.length);
    expect(realPlaces.filter((place) => place.photoSource)).toHaveLength(observedPhotos.length);
    for (const place of realPlaces) {
      const photo = observedPhotos.find((record) => record.sourceId === place.sourceId);
      if (photo) {
        expect(place.imageKind).toBe("photo");
        expect(place.image).toBe(photo.photoUrl);
        expect(place.photoSource).toEqual(photo);
        expect(toPublicPlace(place)?.photoSource).toEqual(photo);
        continue;
      }
      expect(place.imageKind).toBe("placeholder");
      expect(place.image).toBe(categoryPlaceholder[place.type]);
      expect(
        existsSync(resolve(process.cwd(), "public", place.image.slice(1))),
      ).toBe(true);
    }
  });

  it("keeps undated attraction policies unknown while retaining their source conditions", () => {
    const tourismPlaces = realPlaces.filter((place) => place.type === "attraction");
    for (const place of tourismPlaces) {
      expect(place.verifiedAt).toBeNull();
      expect(place.sourceUpdatedAt).toBeNull();
      expect(Object.values(place.facts).every((fact) => fact.value === "unknown" && fact.verifiedAt === null)).toBe(true);
      expect(place.sourceObservations?.some((note) => note.field === "근거 확인 범위")).toBe(true);
    }
    expect(tourismPlaces.find((place) => place.name.ko === "협재해수욕장")?.sourceObservations?.find((note) => note.field === "petPolicy")?.value).toContain("입욕을 제한");
    expect(tourismPlaces.find((place) => place.name.ko === "성산일출봉")?.sourceObservations?.find((note) => note.field === "accessAssistance")?.value).toContain("계단과 오르막");
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
