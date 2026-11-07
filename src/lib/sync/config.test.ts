import { describe, expect, it } from "vitest";
import {
  dailySyncRunId,
  getSyncReadiness,
  type SyncEnvironment,
} from "./config";

const now = Date.parse("2026-11-08T00:00:00Z");
const prepared: SyncEnvironment = {
  VISITJEJU_SYNC_ENABLED: "true",
  CLOUD_SERVICES_ENABLED: "true",
  VISITJEJU_API_ENABLED: "true",
  VISITJEJU_USAGE_APPROVED: "true",
  VISITJEJU_SYNC_COST_APPROVED: "true",
  VISITJEJU_STORAGE_APPROVED: "true",
  VISITJEJU_SYNC_APPROVAL_EXPIRES_AT: "2026-11-09T00:00:00Z",
  VISITJEJU_API_KEY: "test-provider-key",
  VISITJEJU_API_URL: "https://api.visitjeju.net/vsjApi/contents/searchList",
  VISITJEJU_API_KEY_PARAM: "apiKey",
  FIREBASE_ADMIN_PROJECT_ID: "test-project",
  FIREBASE_ADMIN_CLIENT_EMAIL: "test@example.invalid",
  FIREBASE_ADMIN_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----test-only",
  CRON_SECRET: "test-only-cron-secret-abcdefghijklmnopqrstuvwxyz",
};

describe("sync readiness", () => {
  it("fails closed on an empty environment and never returns secret values", () => {
    const result = getSyncReadiness({}, now);
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("SYNC_DISABLED");
    const encoded = JSON.stringify(getSyncReadiness(prepared, now));
    for (const value of [
      prepared.CRON_SECRET,
      prepared.VISITJEJU_API_KEY,
      prepared.FIREBASE_ADMIN_PRIVATE_KEY,
    ])
      expect(encoded).not.toContain(value);
  });
  it("requires every separate approval and exact opt-in", () => {
    expect(getSyncReadiness(prepared, now).ready).toBe(true);
    for (const key of [
      "VISITJEJU_SYNC_ENABLED",
      "CLOUD_SERVICES_ENABLED",
      "VISITJEJU_API_ENABLED",
      "VISITJEJU_USAGE_APPROVED",
      "VISITJEJU_SYNC_COST_APPROVED",
      "VISITJEJU_STORAGE_APPROVED",
    ]) {
      for (const value of [undefined, "false", "TRUE", "1"])
        expect(getSyncReadiness({ ...prepared, [key]: value }, now).ready).toBe(
          false,
        );
    }
  });
  it("blocks missing, malformed, expired and timezone-ambiguous approval expiry", () => {
    for (const value of [
      undefined,
      "",
      "2026-11-09",
      "2026-11-09T09:00:00",
      "2026-11-08T00:00:00Z",
      "2027-02-30T00:00:00Z",
      "invalid",
    ])
      expect(
        getSyncReadiness(
          { ...prepared, VISITJEJU_SYNC_APPROVAL_EXPIRES_AT: value },
          now,
        ).blockers,
      ).toContain("APPROVAL_EXPIRED_OR_MISSING");
  });
  it("requires a fixed HTTPS provider endpoint and credentials", () => {
    for (const endpoint of [
      "http://api.visitjeju.net/vsjApi/contents/searchList",
      "https://other.invalid/vsjApi/contents/searchList",
      "https://api.visitjeju.net/other",
      `${prepared.VISITJEJU_API_URL}?apiKey=do-not-store`,
      `${prepared.VISITJEJU_API_URL}#fragment`,
    ])
      expect(
        getSyncReadiness({ ...prepared, VISITJEJU_API_URL: endpoint }, now)
          .blockers,
      ).toContain("PROVIDER_CONFIGURATION");
    expect(
      getSyncReadiness({ ...prepared, VISITJEJU_API_KEY: "" }, now).ready,
    ).toBe(false);
    expect(
      getSyncReadiness({ ...prepared, FIREBASE_ADMIN_PRIVATE_KEY: "" }, now)
        .ready,
    ).toBe(false);
  });
  it("permits lower per-run bounds but refuses expansion and malformed limits", () => {
    expect(
      getSyncReadiness(
        {
          ...prepared,
          VISITJEJU_SYNC_MAX_PAGES: "1",
          VISITJEJU_SYNC_MAX_ITEMS: "10",
        },
        now,
      ).limits,
    ).toMatchObject({ maxPages: 1, maxItems: 10 });
    for (const value of ["3", "0", "2.5", "-1", "Infinity"])
      expect(
        getSyncReadiness({ ...prepared, VISITJEJU_SYNC_MAX_PAGES: value }, now)
          .blockers,
      ).toContain("SYNC_LIMITS_CONFIGURATION");
    expect(
      getSyncReadiness({ ...prepared, VISITJEJU_SYNC_MAX_ITEMS: "101" }, now)
        .ready,
    ).toBe(false);
  });
  it("rejects weak or whitespace cron secrets", () => {
    for (const value of [
      undefined,
      "",
      "short",
      `${prepared.CRON_SECRET} `,
      "x".repeat(257),
    ])
      expect(
        getSyncReadiness({ ...prepared, CRON_SECRET: value }, now).blockers,
      ).toContain("CRON_SECRET_CONFIGURATION");
  });
  it("uses one id per UTC day including the date boundary", () => {
    expect(dailySyncRunId(now)).toBe(dailySyncRunId(now + 86_399_999));
    expect(dailySyncRunId(now + 86_400_000)).not.toBe(dailySyncRunId(now));
  });
});
