import { describe, expect, it } from "vitest";
import { matchesCompanions, type CompanionStatuses } from "./spot-map-filter";

const status = (kids: CompanionStatuses["kids"], pet: CompanionStatuses["pet"], senior: CompanionStatuses["senior"]): CompanionStatuses => ({ kids, pet, senior });

describe("spot map companion filter", () => {
  it("keeps everything when nobody is selected", () => {
    expect(matchesCompanions(status("unknown", "no", "unknown"), [], "and", true)).toBe(true);
  });

  it("AND requires every selected companion", () => {
    const place = status("yes", "unknown", "yes");
    expect(matchesCompanions(place, ["kids", "senior"], "and", true)).toBe(true);
    expect(matchesCompanions(place, ["kids", "pet"], "and", true)).toBe(false);
  });

  it("OR accepts any selected companion", () => {
    expect(matchesCompanions(status("yes", "unknown", "unknown"), ["kids", "pet"], "or", true)).toBe(true);
    expect(matchesCompanions(status("unknown", "no", "unknown"), ["kids", "pet"], "or", true)).toBe(false);
  });

  it("never treats unknown or no as a match, and gates conditional", () => {
    expect(matchesCompanions(status("unknown", "unknown", "unknown"), ["kids"], "or", true)).toBe(false);
    expect(matchesCompanions(status("no", "no", "no"), ["pet"], "and", true)).toBe(false);
    expect(matchesCompanions(status("conditional", "unknown", "unknown"), ["kids"], "and", true)).toBe(true);
    expect(matchesCompanions(status("conditional", "unknown", "unknown"), ["kids"], "and", false)).toBe(false);
  });
});
