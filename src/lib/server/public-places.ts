import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import type { Place } from "@/lib/types";
import { demoPlaces } from "@/data/places";
import { realPlaces } from "@/data/catalog";
import { getAdminServices } from "@/lib/firebase/admin";
import { ServiceError } from "./errors";
import { toPublicPlace } from "./place-schema";

export const PUBLIC_PLACES_CACHE_TAG = "modujeju:public-places";
export const PUBLIC_PLACES_REVALIDATE_SECONDS = 60;

async function readPublishedPlaces(): Promise<Place[]> {
  try {
    const { db } = getAdminServices();
    const snapshot = await db
      .collection("places")
      .where("status", "==", "published")
      .limit(1000)
      .get();
    const places: Place[] = [];
    for (const doc of snapshot.docs) {
      const place = toPublicPlace(doc.data());
      if (!place || place.dataMode !== "live")
        throw new ServiceError("INVALID_PUBLISHED_DATA", 503);
      if (
        place.facts.operating.value === "closed" ||
        place.facts.operating.value === "suspended"
      )
        continue;
      places.push(place);
    }
    return places;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    // An outage must never silently replace real places with demonstration data.
    throw new ServiceError("CATALOG_UNAVAILABLE", 503);
  }
}

// A single server cache is shared by pages and the JSON endpoint. It contains
// only the public allowlist and never caches credentials or editorial records.
const readCachedPublishedPlaces = unstable_cache(
  readPublishedPlaces,
  [
    "modujeju:public-places:v1",
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? "unconfigured",
  ],
  {
    revalidate: PUBLIC_PLACES_REVALIDATE_SECONDS,
    tags: [PUBLIC_PLACES_CACHE_TAG],
  },
);

export async function getPublicPlaces(): Promise<Place[]> {
  // Demonstration is an explicit product mode, separate from cloud access.
  // Official observed listings remain usable without paid/cloud services.
  if (process.env.DEMO_MODE === "true") return demoPlaces;
  if (process.env.CLOUD_SERVICES_ENABLED !== "true") return realPlaces;
  return readCachedPublishedPlaces();
}

/** Call only after a successful editorial transaction. */
export function invalidatePublicPlaces(): void {
  if (process.env.CLOUD_SERVICES_ENABLED !== "true") return;
  // Hiding or closing a place must not serve the old published record once
  // invalidation reaches the cache. Route handlers cannot call updateTag.
  revalidateTag(PUBLIC_PLACES_CACHE_TAG, { expire: 0 });
}
