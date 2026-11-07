import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  get: vi.fn(),
  sourceGet: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  collection: vi.fn(),
  cache: vi.fn(),
  invalidate: vi.fn(),
  cachedRead: vi.fn(),
  cacheOptions: null as unknown,
}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminServices: mocks.admin }));
vi.mock("next/cache", () => ({
  unstable_cache: mocks.cache.mockImplementation(
    (read: () => Promise<unknown>, _keys: string[], options: unknown) => {
      mocks.cacheOptions = options;
      mocks.cachedRead.mockImplementation(read);
      return mocks.cachedRead;
    },
  ),
  revalidateTag: mocks.invalidate,
}));

import { demoPlaces } from "@/data/places";
import { realPlaces } from "@/data/catalog";
import {
  getPublicPlaces,
  invalidatePublicPlaces,
  PUBLIC_PLACES_CACHE_TAG,
} from "./public-places";
import { GET } from "@/app/api/places/route";

beforeEach(() => {
  vi.stubEnv("DEMO_MODE", "false");
  mocks.admin.mockClear();
  mocks.get.mockReset();
  mocks.sourceGet.mockReset().mockResolvedValue({ docs: [], size: 0 });
  mocks.orderBy.mockReset();
  mocks.limit.mockReset();
  mocks.collection.mockReset();
  mocks.cachedRead.mockClear();
  mocks.invalidate.mockClear();
  mocks.admin.mockReturnValue({ db: { collection: mocks.collection } });
  mocks.collection.mockImplementation((name: string) => ({
    orderBy(field: string) {
      mocks.orderBy(field);
      return {
        limit(size: number) {
          mocks.limit(size);
          return { get: name === "sourcePlaces" ? mocks.sourceGet : mocks.get };
        },
      };
    },
  }));
});
afterEach(() => vi.unstubAllEnvs());

describe("public catalog caching", () => {
  it("uses a bounded, tagged server cache", () => {
    expect(mocks.cacheOptions).toEqual({
      revalidate: 60,
      tags: [PUBLIC_PLACES_CACHE_TAG],
    });
  });
  it("serves official observed data without entering the cache or SDK when services are disabled", async () => {
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "false");
    expect(await getPublicPlaces()).toBe(realPlaces);
    expect(await getPublicPlaces()).not.toBe(demoPlaces);
    expect(mocks.cachedRead).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
    invalidatePublicPlaces();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("defaults to official observed data when feature flags are missing", async () => {
    vi.stubEnv("DEMO_MODE", undefined);
    vi.stubEnv("CLOUD_SERVICES_ENABLED", undefined);
    expect(await getPublicPlaces()).toBe(realPlaces);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("only selects fictional demo data through an explicit demo flag", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "true");
    expect(await getPublicPlaces()).toBe(demoPlaces);
    expect(mocks.cachedRead).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("returns only validated live published data without internal fields", async () => {
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "true");
    const live = {
      ...demoPlaces[0],
      dataMode: "live",
      status: "published",
      internalNotes: "never public",
      updatedBy: "private-user",
    };
    mocks.get.mockResolvedValue({ docs: [{ data: () => live }], size: 1 });
    const places = await getPublicPlaces();
    expect(places).toHaveLength(1);
    expect(mocks.collection).toHaveBeenCalledWith("sourcePlaces");
    expect(mocks.collection).toHaveBeenCalledWith("places");
    expect(mocks.orderBy).toHaveBeenCalledWith("__name__");
    expect(mocks.limit).toHaveBeenCalledWith(500);
    expect(JSON.stringify(places)).not.toMatch(
      /private-user|never public|internalNotes/,
    );
  });
  it("propagates cloud failures without substituting demo content", async () => {
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "true");
    mocks.get.mockRejectedValue(new Error("provider credential detail"));
    await expect(getPublicPlaces()).rejects.toMatchObject({
      code: "CATALOG_UNAVAILABLE",
    });
  });
  it("reads newly sourced basic records with unknown policies before editorial publication", async () => {
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "true");
    const place = { ...demoPlaces[0], dataMode: "live", sourceId: "CONT_TEST" };
    mocks.sourceGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            eligible: true,
            place,
            candidatePhotoUrl: "private-candidate",
          }),
        },
      ],
      size: 1,
    });
    mocks.get.mockResolvedValue({ docs: [], size: 0 });
    const places = await getPublicPlaces();
    expect(places).toHaveLength(1);
    expect(places[0].sourceId).toBe("CONT_TEST");
    expect(places[0].facts.kidsEntry.value).toBe("unknown");
    expect(places[0].price.amount).toBeNull();
    expect(places[0].imageKind).toBe("placeholder");
    expect(JSON.stringify(places)).not.toContain("private-candidate");
  });
  it("honors a hidden editorial overlay even if its basic source record remains eligible", async () => {
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "true");
    const place = { ...demoPlaces[0], dataMode: "live", sourceId: "CONT_TEST" };
    mocks.sourceGet.mockResolvedValue({
      docs: [{ data: () => ({ eligible: true, place }) }],
      size: 1,
    });
    mocks.get.mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: place.id,
            sourceId: "CONT_TEST",
            status: "hidden",
          }),
        },
      ],
      size: 1,
    });
    expect(await getPublicPlaces()).toEqual([]);
  });
  it("expires publication changes immediately instead of serving old hidden data", () => {
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "true");
    invalidatePublicPlaces();
    expect(mocks.invalidate).toHaveBeenCalledWith(PUBLIC_PLACES_CACHE_TAG, {
      expire: 0,
    });
  });
  it("prevents a separate JSON response cache from outliving publication invalidation", async () => {
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "false");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("does not cache provider error responses or expose their details", async () => {
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "true");
    mocks.get.mockRejectedValue(new Error("provider credential detail"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: { code: "CATALOG_UNAVAILABLE" },
    });
  });
});
