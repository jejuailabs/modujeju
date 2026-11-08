import { describe, expect, it } from "vitest";
import restaurants from "../../research_notes/catalog/restaurants.json";
import { mapOfficialRecord } from "./official-catalog";
import { applyCatalogPhotos, catalogPhotoSchema, isVisitJejuPhotoUrl } from "./catalog-photos";
import { toPublicPlace } from "./server/place-schema";

const fixture = () => mapOfficialRecord(restaurants[0]);
const observedPhoto = () => {
  const place = fixture();
  const source = new URL(place.sourceUrl!);
  source.searchParams.set("menuId", "DOM_000001718000000000");
  source.hash = "p1";
  return {
    sourceId: place.sourceId!,
    sourceUrl: source.toString(),
    photoUrl: "https://api.cdn.visitjeju.net/photomng/fixture/place.jpg",
    alt: `${place.name.ko} · 비짓제주 사진`,
    observedAt: "2026-11-08",
    sourceName: "비짓제주" as const,
  };
};

describe("official page photo references", () => {
  it("matches content identity while preserving the observed menu URL and page fragment", () => {
    const place = fixture();
    const photo = observedPhoto();
    const [result] = applyCatalogPhotos([place], [photo]);
    expect(result.imageKind).toBe("photo");
    expect(result.image).toBe(photo.photoUrl);
    expect(result.photoSource).toEqual(photo);
    expect(toPublicPlace(result)?.photoSource).toEqual(photo);
    expect(result.facts).toBe(place.facts);
    expect(result.verifiedAt).toBe(place.verifiedAt);
    expect(result).not.toHaveProperty("imageRights");
    expect(result.photoSource).not.toHaveProperty("license");
    expect(place.imageKind).toBe("placeholder");
  });

  it.each([
    "http://api.cdn.visitjeju.net/photomng/photo.jpg",
    "https://api.cdn.visitjeju.net.evil.example/photomng/photo.jpg",
    "https://api.cdn.visitjeju.net@evil.example/photomng/photo.jpg",
    "https://user:password@api.cdn.visitjeju.net/photomng/photo.jpg",
    "https://api.cdn.visitjeju.net:443/photomng/photo.jpg",
    "https://api.cdn.visitjeju.net:8443/photomng/photo.jpg",
    "https://api.cdn.visitjeju.net/other/photo.jpg",
    "https://api.cdn.visitjeju.net/photomng/../other/photo.jpg",
    "https://api.cdn.visitjeju.net/photomng/%2e%2e/other/photo.jpg",
    "https://api.cdn.visitjeju.net/photomng/photo.jpg#fragment",
    "//api.cdn.visitjeju.net/photomng/photo.jpg",
    "javascript:alert(1)",
  ])("rejects an unsafe photo URL: %s", (photoUrl) => {
    expect(isVisitJejuPhotoUrl(photoUrl)).toBe(false);
    expect(() => applyCatalogPhotos([fixture()], [{ ...observedPhoto(), photoUrl }])).toThrow();
  });

  it("fails closed for a different listing, duplicate identities and untrusted source pages", () => {
    const place = fixture();
    const photo = observedPhoto();
    expect(() => applyCatalogPhotos([place], [{ ...photo, sourceId: "CNTS_DIFFERENT" }])).toThrow("PHOTO_SOURCE_ID_MISMATCH");
    expect(() => applyCatalogPhotos([place], [{ ...photo, sourceId: "CNTS_DIFFERENT", sourceUrl: "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_DIFFERENT" }])).toThrow("PHOTO_PLACE_IDENTITY_MISMATCH");
    expect(() => applyCatalogPhotos([{ ...place, sourceUrl: "https://www.visitjeju.net/kr/detail/view?contentsid=OTHER" }], [photo])).toThrow("PHOTO_PLACE_IDENTITY_MISMATCH");
    expect(() => applyCatalogPhotos([{ ...place, dataMode: "demo" }], [photo])).toThrow("PHOTO_PLACE_IDENTITY_MISMATCH");
    expect(() => applyCatalogPhotos([place], [photo, photo])).toThrow("DUPLICATE_PHOTO_SOURCE_ID");
    for (const sourceUrl of [
      `https://evil.example/kr/detail/view?contentsid=${place.sourceId}`,
      `https://user:password@www.visitjeju.net/kr/detail/view?contentsid=${place.sourceId}`,
      `https://www.visitjeju.net:443/kr/detail/view?contentsid=${place.sourceId}`,
      `https://www.visitjeju.net/kr/detail/view?contentsid=${place.sourceId}&contentsid=OTHER`,
    ]) expect(catalogPhotoSchema.safeParse({ ...photo, sourceUrl }).success).toBe(false);
  });

  it("rejects invalid observations and inconsistent public photo metadata", () => {
    const photo = observedPhoto();
    for (const observedAt of ["2024-12-31", "2026-02-30", "not-a-date"]) {
      expect(catalogPhotoSchema.safeParse({ ...photo, observedAt }).success).toBe(false);
    }
    const [place] = applyCatalogPhotos([fixture()], [photo]);
    expect(toPublicPlace({ ...place, image: "https://unrelated.example/photo.jpg" })).toBeNull();
    expect(toPublicPlace({ ...place, sourceId: "OTHER" })).toBeNull();
    expect(toPublicPlace({ ...place, imageKind: "placeholder" })).toBeNull();
    expect(toPublicPlace({ ...place, photoSource: { ...photo, license: "permitted" } })).toBeNull();
  });

  it("keeps a place without an observed photo unchanged", () => {
    const place = fixture();
    expect(applyCatalogPhotos([place], [])[0]).toBe(place);
  });
});
