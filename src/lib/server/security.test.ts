import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createUnknownFacts } from "@/lib/types";
import { assertCloudEnabled } from "./errors";
import { assertSameOrigin, errorResponse, readJson } from "./http";
import {
  assertPublishingReady,
  placeWriteSchema,
  toPublicPlace,
} from "./place-schema";
import { enforceRateLimit } from "./rate-limit";

afterEach(() => vi.unstubAllEnvs());
const labels = { ko: "샘플", en: "Sample", zh: "示例", ja: "サンプル" };
const place = {
  id: "test-place",
  slug: "test-place",
  name: labels,
  summary: labels,
  address: labels,
  district: labels,
  region: "east",
  type: "attraction",
  lat: 33.4,
  lng: 126.8,
  image: "/assets/icons/map-pin.svg",
  price: { amount: null, unit: "person", petExtra: null },
  durationMinutes: 0,
  facts: createUnknownFacts(),
  verifiedAt: null,
  dataMode: "live",
  sourceUrl: "https://www.visitjeju.net/kr/detail/view?contentsid=test",
};

describe("server security boundaries", () => {
  it("does not authorize cloud calls merely because credentials may be present", () => {
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "false");
    expect(() => assertCloudEnabled()).toThrow(
      "Cloud services are not enabled",
    );
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "TRUE");
    expect(() => assertCloudEnabled()).toThrow();
  });
  it("rejects cross-origin and missing-origin writes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://modujeju.example");
    expect(() =>
      assertSameOrigin(new Request("https://modujeju.example/api/reports")),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://modujeju.example/api/reports", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://modujeju.example/api/reports", {
          headers: { origin: "https://modujeju.example" },
        }),
      ),
    ).not.toThrow();
  });
  it("rejects oversized streamed JSON even without Content-Length", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(200) }),
    });
    await expect(
      readJson(request, z.object({ text: z.string() }), 100),
    ).rejects.toMatchObject({ code: "BODY_TOO_LARGE" });
  });
  it("rejects extra body fields rather than silently accepting privileged input", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "okay", admin: true }),
    });
    await expect(
      readJson(request, z.object({ text: z.string() }).strict()),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
  it("redacts details from unexpected provider errors", async () => {
    const response = errorResponse(
      new Error("https://provider?apikey=secret PRIVATE KEY"),
    );
    expect(JSON.stringify(await response.json())).not.toMatch(
      /apikey|PRIVATE|secret/,
    );
  });
  it("rate limits and resets windows", () => {
    enforceRateLimit("test-window", 2, 100, 1000);
    enforceRateLimit("test-window", 2, 100, 1001);
    expect(() => enforceRateLimit("test-window", 2, 100, 1002)).toThrow();
    expect(() => enforceRateLimit("test-window", 2, 100, 1101)).not.toThrow();
  });
  it("strips internal metadata from public places and nested facts", () => {
    const result = toPublicPlace({
      ...place,
      updatedBy: "secret-uid",
      internalNotes: "private",
      facts: {
        ...place.facts,
        kidsEntry: { ...place.facts.kidsEntry, verifiedBy: "secret-uid" },
      },
    });
    expect(result).not.toBeNull();
    expect(JSON.stringify(result)).not.toMatch(
      /secret-uid|internalNotes|verifiedBy/,
    );
  });
  it("rejects publishing unverified imported data", () => {
    const input = placeWriteSchema.parse({
      place,
      status: "published",
      imageRights: { status: "placeholder", credit: "", license: "" },
    });
    expect(() => assertPublishingReady(input)).toThrow();
  });
  it("allows an unverified record to remain a draft", () => {
    const input = placeWriteSchema.parse({
      place,
      status: "draft",
      imageRights: { status: "unverified", credit: "", license: "" },
    });
    expect(() => assertPublishingReady(input)).not.toThrow();
  });
  it("only accepts real calendar days for companion verification", () => {
    const input = (verifiedAt: string) => ({
      place: {
        ...place,
        facts: {
          ...place.facts,
          kidsEntry: { value: "yes", source: "official", verifiedAt },
        },
      },
      status: "draft",
      imageRights: { status: "placeholder", credit: "", license: "" },
    });
    expect(placeWriteSchema.safeParse(input("2026-11-07")).success).toBe(true);
    expect(placeWriteSchema.safeParse(input("2024-02-29")).success).toBe(true);
    expect(placeWriteSchema.safeParse(input("2026-02-29")).success).toBe(false);
    expect(placeWriteSchema.safeParse(input("2026-02-31")).success).toBe(false);
    expect(
      placeWriteSchema.safeParse(input("2026-11-07T00:00:00Z")).success,
    ).toBe(false);
  });
  it("keeps source retrieval timestamps separate from companion verification", () => {
    const input = placeWriteSchema.parse({
      place: { ...place, retrievedAt: "2026-11-07T14:00:00.000Z" },
      status: "draft",
      imageRights: { status: "placeholder", credit: "", license: "" },
    });
    expect(input.place.retrievedAt).toBe("2026-11-07T14:00:00.000Z");
    expect(input.place.facts.kidsEntry.verifiedAt).toBeNull();
  });
});
