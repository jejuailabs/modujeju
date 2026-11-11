import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fetchVisitJejuPage } from "./client";

const request = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", request);
  request.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function approvedConfiguration() {
  vi.stubEnv("CLOUD_SERVICES_ENABLED", "true");
  vi.stubEnv("VISITJEJU_API_ENABLED", "true");
  vi.stubEnv("VISITJEJU_USAGE_APPROVED", "true");
  vi.stubEnv("VISITJEJU_API_KEY", "test-key-not-real");
  vi.stubEnv("VISITJEJU_API_KEY_PARAM", "apiKey");
  vi.stubEnv(
    "VISITJEJU_API_URL",
    "https://api.visitjeju.net/vsjApi/contents/searchList",
  );
}

describe("VisitJeju paid/network boundary", () => {
  it("never calls fetch when cloud is off", async () => {
    approvedConfiguration();
    vi.stubEnv("CLOUD_SERVICES_ENABLED", "false");
    await expect(fetchVisitJejuPage({})).rejects.toMatchObject({
      code: "CLOUD_DISABLED",
    });
    expect(request).not.toHaveBeenCalled();
  });
  it("requires explicit API use approval even when cloud is enabled", async () => {
    approvedConfiguration();
    vi.stubEnv("VISITJEJU_USAGE_APPROVED", "false");
    await expect(fetchVisitJejuPage({})).rejects.toMatchObject({
      code: "VISITJEJU_DISABLED",
    });
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects plaintext HTTP before a key can be transmitted", async () => {
    approvedConfiguration();
    vi.stubEnv(
      "VISITJEJU_API_URL",
      "http://api.visitjeju.net/vsjApi/contents/searchList",
    );
    await expect(fetchVisitJejuPage({})).rejects.toMatchObject({
      code: "VISITJEJU_ENDPOINT_DENIED",
    });
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects an arbitrary host even if configured", async () => {
    approvedConfiguration();
    vi.stubEnv(
      "VISITJEJU_API_URL",
      "https://evil.example/vsjApi/contents/searchList",
    );
    await expect(fetchVisitJejuPage({})).rejects.toMatchObject({
      code: "VISITJEJU_ENDPOINT_DENIED",
    });
    expect(request).not.toHaveBeenCalled();
  });
  it("requires confirming the documented key parameter spelling", async () => {
    approvedConfiguration();
    vi.stubEnv("VISITJEJU_API_KEY_PARAM", "");
    await expect(fetchVisitJejuPage({})).rejects.toMatchObject({
      code: "VISITJEJU_CONFIGURATION",
    });
    expect(request).not.toHaveBeenCalled();
  });
  it("redacts provider URLs and secrets from thrown fetch errors", async () => {
    approvedConfiguration();
    request.mockRejectedValue(
      new Error("Failed fetching ?apiKey=test-key-not-real"),
    );
    await expect(fetchVisitJejuPage({})).rejects.toMatchObject({
      code: "VISITJEJU_UNAVAILABLE",
    });
    try {
      await fetchVisitJejuPage({});
    } catch (error) {
      expect(String(error)).not.toContain("test-key-not-real");
    }
  });
  it.each(["apiKey", "apikey"])("sends the canonical apiKey parameter with %s configured", async (keyName) => {
    approvedConfiguration();
    vi.stubEnv("VISITJEJU_API_KEY_PARAM", keyName);
    request.mockResolvedValue(
      new Response(
        JSON.stringify({
          result: "200",
          resultMessage: "SUCCESS",
          currentPage: 1,
          pageCount: 1,
          totalCount: 0,
          resultCount: 0,
          pageSize: 100,
          items: [],
        }),
      ),
    );
    expect(await fetchVisitJejuPage({ locale: "ja" })).toEqual({
      currentPage: 1,
      pageCount: 1,
      totalCount: 0,
      items: [],
    });
    const url = request.mock.calls[0][0] as URL;
    expect(url.searchParams.get("apiKey")).toBe("test-key-not-real");
    expect(url.searchParams.has("apikey")).toBe(false);
    expect(url.searchParams.get("locale")).toBe("jp");
    expect(request.mock.calls[0][1].redirect).toBe("error");
  });
  it("reports an HTML block page without exposing its body", async () => {
    approvedConfiguration();
    request.mockResolvedValue(new Response("<html>test-key-not-real</html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=UTF-8" },
    }));
    await expect(fetchVisitJejuPage({})).rejects.toMatchObject({
      code: "VISITJEJU_HTML_RESPONSE",
      message: expect.not.stringContaining("test-key-not-real"),
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("accepts documented numeric-string pagination without coercing null or booleans", async () => {
    approvedConfiguration();
    request.mockResolvedValue(new Response(JSON.stringify({ result: "200", resultMessage: "SUCCESS", currentPage: "1", pageCount: "1", totalCount: "1", resultCount: "1", pageSize: "100", items: [{ contentsid: "A" }] })));
    expect(await fetchVisitJejuPage({})).toMatchObject({ currentPage: 1, pageCount: 1, totalCount: 1 });
  });
  it.each([
    { currentPage: null }, { currentPage: true }, { currentPage: "0x1" }, { currentPage: 0 },
    { pageCount: 0 }, { pageCount: 2 }, { totalCount: "" }, { totalCount: -1 },
    { resultCount: 0 }, { pageSize: 0 }, { pageSize: 1001 }, { resultCount: undefined }, { totalCount: 101, pageCount: 2 },
  ])("rejects inconsistent or coercible pagination metadata %o", async (override) => {
    approvedConfiguration();
    request.mockResolvedValue(new Response(JSON.stringify({ result: "200", resultMessage: "SUCCESS", currentPage: 1, pageCount: 1, totalCount: 1, resultCount: 1, pageSize: 100, items: [{ contentsid: "A" }], ...override })));
    await expect(fetchVisitJejuPage({})).rejects.toMatchObject({ code: "VISITJEJU_INVALID_RESPONSE" });
  });
  it("rejects a nonempty full-catalog page beyond its declared final page", async () => {
    approvedConfiguration();
    request.mockResolvedValue(new Response(JSON.stringify({ result: "200", resultMessage: "SUCCESS", currentPage: 2, pageCount: 1, totalCount: 1, resultCount: 1, pageSize: 100, items: [{ contentsid: "A" }] })));
    await expect(fetchVisitJejuPage({ page: 2 })).rejects.toMatchObject({ code: "VISITJEJU_INVALID_RESPONSE" });
  });
  it("retains the documented cid-filter pagination exception", async () => {
    approvedConfiguration();
    request.mockResolvedValue(new Response(JSON.stringify({ result: "200", resultMessage: "SUCCESS", currentPage: 2, pageCount: 1, totalCount: 1, resultCount: 1, pageSize: 100, items: [{ contentsid: "A" }] })));
    expect(await fetchVisitJejuPage({ page: 2, contentId: "A" })).toMatchObject({ currentPage: 2, pageCount: 1, totalCount: 1 });
  });
});
