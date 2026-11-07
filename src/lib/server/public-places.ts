import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import type { Place } from "@/lib/types";
import { demoPlaces } from "@/data/places";
import { realPlaces } from "@/data/catalog";
import { readFirestoreSyncCatalog } from "@/lib/sync/public-catalog";

export const PUBLIC_PLACES_CACHE_TAG = "modujeju:public-places";
export const PUBLIC_PLACES_REVALIDATE_SECONDS = 60;

async function readCloudPlaces(): Promise<Place[]> {
  return readFirestoreSyncCatalog();
}

// A single server cache is shared by pages and the JSON endpoint. It contains
// only the public allowlist and never caches credentials or editorial records.
const readCachedPublishedPlaces = unstable_cache(
  readCloudPlaces,
  [
    "modujeju:public-places:v2",
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

/** Call only after a successful transaction changes publicly readable catalog data. */
export function invalidatePublicPlaces(): void {
  if (process.env.CLOUD_SERVICES_ENABLED !== "true") return;
  // Hiding or closing a place must not serve the old published record once
  // invalidation reaches the cache. Route handlers cannot call updateTag.
  revalidateTag(PUBLIC_PLACES_CACHE_TAG, { expire: 0 });
}
