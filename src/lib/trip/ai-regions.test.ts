import { describe, expect, it } from "vitest";
import { regionRankingMessages, validateAiRegionOrder } from "./ai-regions";

describe("browser AI output boundary", () => {
  it("accepts only a complete permutation of saved candidate regions", () => {
    expect(validateAiRegionOrder({ regionOrder: ["south", "east"] }, ["east", "south"])).toEqual(["south", "east"]);
    expect(validateAiRegionOrder({ regionOrder: ["west", "east"] }, ["east", "south"])).toBeNull();
    expect(validateAiRegionOrder({ regionOrder: ["east", "east"] }, ["east", "south"])).toBeNull();
    expect(validateAiRegionOrder({ regionOrder: ["east"] }, ["east", "south"])).toBeNull();
    expect(validateAiRegionOrder("east,south", ["east", "south"])).toBeNull();
  });
  it("bounds model input and keeps catalogue names in a data message", () => {
    const messages = regionRankingMessages([{ region: "east", names: Array(30).fill("x".repeat(100)), categories: ["cafe"], hasStay: false }], ["kids"], "z".repeat(1000));
    const payload = JSON.parse(messages[1].content);
    expect(payload.preference).toHaveLength(240);
    expect(payload.regions[0].names).toHaveLength(6);
    expect(payload.regions[0].names[0]).toHaveLength(40);
    expect(messages[0].content).not.toContain("x".repeat(100));
  });
});
