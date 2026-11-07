import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  get: vi.fn(),
  where: vi.fn(),
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
  mocks.where.mockReset();
  mocks.limit.mockReset();
  mocks.collection.mockReset();
  mocks.cachedRead.mockClear();
  mocks.invalidate.mockClear();
  mocks.admin.mockReturnValue({ db: { collection: mocks.collection } });
  mocks.collection.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ limit: mocks.limit });
  mocks.limit.mockReturnValue({ get: mocks.get });
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
      internalNotes: "never public",
      updatedBy: "private-user",
    };
    mocks.get.mockResolvedValue({ docs: [{ data: () => live }] });
    const places = await getPublicPlaces();
    expect(places).toHaveLength(1);
    expect(mocks.where).toHaveBeenCalledWith("status", "==", "published");
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
