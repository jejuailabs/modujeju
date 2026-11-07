import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/sync/runtime", () => ({ runVisitJejuSync: mocks.run }));
import { GET, HEAD } from "./route";

const secret = "test-only-secret-abcdefghijklmnopqrstuvwxyz";
const now = Date.parse("2026-11-08T00:00:00Z");
const ready = {
  CRON_SECRET: secret,
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
  VISITJEJU_SYNC_MAX_PAGES: "2",
  VISITJEJU_SYNC_MAX_ITEMS: "100",
};
const counts = {
  pagesFetched: 1,
  itemsSeen: 1,
  created: 1,
  updated: 0,
  unchanged: 0,
  skipped: 0,
  rejected: 0,
};
const result = {
  status: "completed",
  runId: "visitjeju-ko-20261108",
  scanId: "scan-test",
  cursor: { page: 1, offset: 1, pageHash: "test" },
  counts,
  errorCode: null,
};
const request = (authorization?: string, query = "") =>
  new Request(`http://localhost/api/cron/visitjeju${query}`, {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => {
  for (const [key, value] of Object.entries(ready)) vi.stubEnv(key, value);
  vi.spyOn(Date, "now").mockReturnValue(now);
  mocks.run.mockReset().mockResolvedValue(result);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("VisitJeju scheduled route", () => {
  it("does not execute or reveal readiness without a valid bearer secret", async () => {
    for (const value of [
      undefined,
      "Bearer wrong",
      `bearer ${secret}`,
      `Bearer ${secret.slice(0, -1)}x`,
      "Bearer é",
    ]) {
      const response = await GET(request(value));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: { code: "UNAUTHORIZED" },
      });
    }
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("rejects missing or short configured secrets even when flags are enabled", async () => {
    for (const value of [undefined, "short"]) {
      vi.stubEnv("CRON_SECRET", value);
      expect((await GET(request(`Bearer ${value}`))).status).toBe(503);
    }
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("does not accept credentials in query parameters", async () => {
    expect((await GET(request(undefined, `?secret=${secret}`))).status).toBe(
      401,
    );
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("blocks any disabled gate before external-service orchestration", async () => {
    for (const key of [
      "VISITJEJU_SYNC_ENABLED",
      "CLOUD_SERVICES_ENABLED",
      "VISITJEJU_API_ENABLED",
      "VISITJEJU_USAGE_APPROVED",
      "VISITJEJU_SYNC_COST_APPROVED",
      "VISITJEJU_STORAGE_APPROVED",
    ]) {
      vi.stubEnv(key, "false");
      const response = await GET(request(`Bearer ${secret}`));
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe("SYNC_NOT_READY");
      vi.stubEnv(key, "true");
    }
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("blocks missing provider key and expired approval without running", async () => {
    vi.stubEnv("VISITJEJU_API_KEY", "");
    expect((await GET(request(`Bearer ${secret}`))).status).toBe(503);
    vi.stubEnv("VISITJEJU_API_KEY", ready.VISITJEJU_API_KEY);
    vi.stubEnv("VISITJEJU_SYNC_APPROVAL_EXPIRES_AT", "2026-11-07T00:00:00Z");
    expect((await GET(request(`Bearer ${secret}`))).status).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("uses a fixed daily ID and bounded server config regardless of request parameters", async () => {
    const response = await GET(
      request(
        `Bearer ${secret}`,
        "?page=999&runId=override&maxItems=999999&locale=en",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.run).toHaveBeenCalledWith({
      runId: "visitjeju-ko-20261108",
      limits: {
        maxPages: 2,
        maxItems: 100,
        maxDurationMs: 40_000,
        leaseMs: 120_000,
      },
    });
    expect(await response.json()).toEqual(result);
  });
  it("passes safe failed and duplicate status without inventing success", async () => {
    mocks.run.mockResolvedValueOnce({
      ...result,
      status: "failed",
      errorCode: "SYNC_PROVIDER_FAILED",
    });
    expect((await GET(request(`Bearer ${secret}`))).status).toBe(503);
    mocks.run.mockResolvedValueOnce({ ...result, status: "duplicate" });
    expect((await GET(request(`Bearer ${secret}`))).status).toBe(200);
  });
  it("redacts all thrown provider details", async () => {
    mocks.run.mockRejectedValue(
      new Error(`${secret} ${ready.VISITJEJU_API_KEY} https://private.invalid`),
    );
    const response = await GET(request(`Bearer ${secret}`));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "SYNC_EXECUTION_FAILED" },
    });
  });
  it("never uses HEAD health checks to run ingestion", () => {
    expect(HEAD().status).toBe(405);
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
