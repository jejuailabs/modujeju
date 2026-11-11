import { describe, expect, it } from "vitest";
import { suggestedTripDays } from "./auto-days";

describe("suggestedTripDays", () => {
  it("needs at least one night", () => {
    expect(suggestedTripDays(0, false)).toBe(2);
    expect(suggestedTripDays(3, false)).toBe(2);
  });
  it("paces by companions and caps at the product limit", () => {
    expect(suggestedTripDays(9, false)).toBe(3);
    expect(suggestedTripDays(10, true)).toBe(4);
    expect(suggestedTripDays(500, false)).toBe(5);
    expect(suggestedTripDays(Number.NaN, false)).toBe(2);
  });
});
