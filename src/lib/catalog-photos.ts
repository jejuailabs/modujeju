import { z } from "zod";
import type { Place } from "./types";

/** A public CDN reference, not a grant of reproduction or redistribution rights. */
export function isVisitJejuPhotoUrl(value: string): boolean {
  if (!value.startsWith("https://api.cdn.visitjeju.net/photomng/")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "api.cdn.visitjeju.net"
      && !url.username && !url.password && !url.port && !url.hash
      && url.pathname.startsWith("/photomng/")
      && url.pathname.length > "/photomng/".length;
  } catch {
    return false;
  }
}

function listingId(value: string): string | null {
  if (!/^https:\/\/(?:www\.)?visitjeju\.net\/kr\/detail\/view\?/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["www.visitjeju.net", "visitjeju.net"].includes(url.hostname)
      || url.username || url.password || url.port || url.pathname !== "/kr/detail/view"
      || url.searchParams.getAll("contentsid").length !== 1) return null;
    return url.searchParams.get("contentsid");
  } catch {
    return null;
  }
}

export const catalogPhotoSchema = z.object({
  sourceId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  sourceUrl: z.string().max(2048),
  photoUrl: z.string().max(2048).refine(isVisitJejuPhotoUrl, "INVALID_VISITJEJU_PHOTO_URL"),
  alt: z.string().trim().min(1).max(300),
  observedAt: z.iso.date().refine((value) => value >= "2025-01-01", "PHOTO_OBSERVATION_TOO_OLD"),
  sourceName: z.literal("비짓제주"),
}).strict().refine((record) => listingId(record.sourceUrl) === record.sourceId, "PHOTO_SOURCE_ID_MISMATCH");

export type CatalogPhoto = z.infer<typeof catalogPhotoSchema>;

export function photoMatchesPlace(place: Pick<Place, "sourceId" | "sourceUrl" | "dataMode">, photo: CatalogPhoto): boolean {
  return place.dataMode === "live" && place.sourceId === photo.sourceId
    && listingId(place.sourceUrl ?? "") === photo.sourceId;
}

/** Match the observed photo to its exact official listing; never guess by name. */
export function applyCatalogPhotos(places: Place[], records: readonly unknown[]): Place[] {
  const photos = new Map<string, CatalogPhoto>();
  for (const raw of records) {
    const record = catalogPhotoSchema.parse(raw);
    if (photos.has(record.sourceId)) throw new Error("DUPLICATE_PHOTO_SOURCE_ID");
    if (!places.some((place) => photoMatchesPlace(place, record))) throw new Error("PHOTO_PLACE_IDENTITY_MISMATCH");
    photos.set(record.sourceId, record);
  }
  return places.map((place) => {
    const photo = photos.get(place.sourceId ?? "");
    if (!photo) return place;
    if (!photoMatchesPlace(place, photo)) throw new Error("PHOTO_PLACE_IDENTITY_MISMATCH");
    return { ...place, image: photo.photoUrl, imageKind: "photo", photoSource: photo };
  });
}
