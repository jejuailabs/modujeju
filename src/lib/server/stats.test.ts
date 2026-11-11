import { describe, expect, it } from "vitest";
import { countSignups, dailySeries, isBotUserAgent, lastDays, seoulDay, topSavedPlaces, topViewedPlaces } from "./stats";

describe("stats helpers", () => {
  it("uses the Seoul calendar day", () => {
    expect(seoulDay(new Date("2026-11-10T16:00:00Z"))).toBe("2026-11-11");
    expect(lastDays(new Date("2026-11-11T03:00:00Z"), 3)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
  });
  it("treats missing days as zero, not unknown", () => {
    const series = dailySeries(["a", "b"], new Map([["a", { pageViews: 4 }]]));
    expect(series).toEqual([
      { day: "a", pageViews: 4, uniqueVisitors: 0 },
      { day: "b", pageViews: 0, uniqueVisitors: 0 },
    ]);
  });
  it("ranks places and ignores unsafe keys", () => {
    const top = topViewedPlaces([{ placeViews: { a: 2, b: 5, "../x": 99 } }, { placeViews: { a: 4 } }], 2);
    expect(top).toEqual([{ id: "a", count: 6 }, { id: "b", count: 5 }]);
    expect(topSavedPlaces(["x", "y", "x"], 1)).toEqual([{ id: "x", count: 2 }]);
  });
  it("counts signups by window", () => {
    const now = new Date("2026-11-11T00:00:00Z");
    expect(countSignups(["2026-11-10T00:00:00Z", "2026-10-20T00:00:00Z", "2025-01-01T00:00:00Z", undefined], now)).toEqual({ last7: 1, last30: 2 });
  });
  it("flags bots and empty agents", () => {
    expect(isBotUserAgent("Googlebot/2.1")).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (iPhone)")).toBe(false);
  });
});
