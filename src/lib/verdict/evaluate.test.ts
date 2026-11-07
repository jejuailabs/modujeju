import { describe, expect, it } from "vitest";
import { demoPlaces } from "../../data/places";
import { filterAndSortPlaces } from "../catalog";
import {
  createDefaultProfile,
  createUnknownFacts,
  type Fact,
  type Place,
  type Profile,
} from "../types";
import { combineVerdicts, evaluatePlace, getFactFreshness } from "./evaluate";

const now = new Date("2026-11-07T12:00:00Z");
const demo = (id = "east-table"): Place =>
  structuredClone(demoPlaces.find((place) => place.id === id)!);
const profile = (patch: Partial<Profile> = {}): Profile => ({
  ...createDefaultProfile(),
  companions: ["kids", "pet", "senior"],
  ...patch,
});

describe("whole-party verdicts", () => {
  it("never averages away a forbidden companion", () => {
    expect(combineVerdicts(["fit", "fit", "notFit"])).toBe("notFit");
    expect(combineVerdicts(["fit", "conditional", "unknown"])).toBe("unknown");
  });

  it("evaluates a fixture without presenting it as verified real-world data", () => {
    const place = demo();
    const result = evaluatePlace(
      place,
      profile({ stroller: true, stepFree: true, shortWalk: true }),
      now,
    );
    expect(result.verdict).toBe("fit");
    expect(result.isDemo).toBe(true);
    expect(place.verifiedAt).toBeNull();
    expect(
      Object.values(place.facts).every((fact) => fact.verifiedAt === null),
    ).toBe(true);
  });

  it("keeps unknown separate from forbidden and surfaces uncertainty first", () => {
    const result = evaluatePlace(demo("north-stay"), profile(), now);
    expect(result.verdict).toBe("unknown");
    expect(result.reasons[0].verdict).toBe("unknown");
    expect(result.companionVerdicts.pet).toBe("unknown");
  });

  it("does not ignore a no-dog policy when children are welcome", () => {
    expect(evaluatePlace(demo("east-aquarium"), profile(), now).verdict).toBe(
      "notFit",
    );
  });

  it("distinguishes an exclusive weight limit from an inclusive limit", () => {
    const exclusive = demo();
    exclusive.facts.dogMaxWeight.value = 8;
    exclusive.facts.dogWeightInclusive.value = false;
    expect(
      evaluatePlace(exclusive, profile({ dogWeight: 8 }), now).verdict,
    ).toBe("notFit");
    exclusive.facts.dogWeightInclusive.value = true;
    expect(
      evaluatePlace(exclusive, profile({ dogWeight: 8 }), now).verdict,
    ).toBe("fit");
  });

  it("treats the exact boundary as unknown if inclusive wording is missing", () => {
    const place = demo();
    place.facts.dogMaxWeight.value = 8;
    place.facts.dogWeightInclusive.value = "unknown";
    expect(evaluatePlace(place, profile({ dogWeight: 8 }), now).verdict).toBe(
      "unknown",
    );
  });

  it("does not invent exclusive wording for an unconfirmed weight boundary", () => {
    const place = demo();
    place.facts.dogMaxWeight.value = 8;
    place.facts.dogWeightInclusive.value = "unknown";
    const below = evaluatePlace(place, profile({ dogWeight: 5 }), now);
    expect(below.verdict).toBe("fit");
    expect(
      below.reasons.find((reason) => reason.code === "weightLimit")?.message.ko,
    ).toContain("상한 포함 여부는 미확인");
    expect(
      below.reasons.find((reason) => reason.code === "weightLimit")?.message.ko,
    ).not.toContain("미만");
    expect(evaluatePlace(place, profile({ dogWeight: 9 }), now).verdict).toBe(
      "notFit",
    );
  });

  it("requests the dog weight when a known limit applies", () => {
    const result = evaluatePlace(
      demo("west-table"),
      profile({ dogWeight: null }),
      now,
    );
    expect(result.verdict).toBe("conditional");
    expect(
      result.reasons.some((reason) => reason.code === "weightMissing"),
    ).toBe(true);
  });

  it("does not treat an unknown weight limit as unlimited", () => {
    const place = demo();
    place.facts.dogMaxWeight.value = "unknown";
    expect(evaluatePlace(place, profile({ dogWeight: 3 }), now).verdict).toBe(
      "unknown",
    );
    place.facts.dogMaxWeight.value = null;
    expect(evaluatePlace(place, profile({ dogWeight: 30 }), now).verdict).toBe(
      "fit",
    );
  });

  it("enforces indoor admission if requested and otherwise explains terrace-only access", () => {
    const place = demo("east-cafe");
    expect(
      evaluatePlace(place, profile({ dogWeight: 5, indoorPet: true }), now)
        .verdict,
    ).toBe("notFit");
    expect(
      evaluatePlace(place, profile({ dogWeight: 5, indoorPet: false }), now)
        .verdict,
    ).toBe("conditional");
  });

  it("makes a carrier requirement visible even with indoor access", () => {
    const place = demo();
    place.facts.carrierRequired.value = true;
    const result = evaluatePlace(place, profile(), now);
    expect(result.verdict).toBe("conditional");
    expect(result.reasons[0].code).toBe("carrierRequired");
  });

  it("enforces minimum child age including age zero", () => {
    const place = demo();
    place.facts.minAge.value = 4;
    expect(evaluatePlace(place, profile({ childAge: 0 }), now).verdict).toBe(
      "notFit",
    );
    expect(evaluatePlace(place, profile({ childAge: 3 }), now).verdict).toBe(
      "notFit",
    );
    expect(evaluatePlace(place, profile({ childAge: 4 }), now).verdict).toBe(
      "fit",
    );
    expect(evaluatePlace(place, profile({ childAge: null }), now).verdict).toBe(
      "conditional",
    );
  });

  it("does not ignore requested stroller access", () => {
    const place = demo();
    place.facts.stroller.value = "no";
    expect(evaluatePlace(place, profile({ stroller: true }), now).verdict).toBe(
      "notFit",
    );
    expect(
      evaluatePlace(place, profile({ stroller: false }), now).verdict,
    ).toBe("fit");
  });

  it("applies mobility requirements without assuming all older people have them", () => {
    const place = demo("south-coast");
    expect(
      evaluatePlace(place, profile({ companions: ["senior"] }), now).verdict,
    ).toBe("fit");
    expect(
      evaluatePlace(
        place,
        profile({ companions: ["senior"], stepFree: true }),
        now,
      ).verdict,
    ).toBe("notFit");
  });

  it("applies step-free access even if no senior companion was selected", () => {
    const place = demo();
    place.facts.stepFree.value = "no";
    expect(
      evaluatePlace(
        place,
        profile({ companions: ["kids"], stepFree: true }),
        now,
      ).verdict,
    ).toBe("notFit");
  });

  it("uses actual walking time rather than the total visit duration", () => {
    const place = demo("west-stay");
    expect(place.durationMinutes).toBe(480);
    expect(
      evaluatePlace(
        place,
        profile({ companions: ["senior"], shortWalk: true }),
        now,
      ).verdict,
    ).toBe("fit");
    place.facts.walkingMinutes.value = 31;
    expect(
      evaluatePlace(
        place,
        profile({ companions: ["senior"], shortWalk: true }),
        now,
      ).verdict,
    ).toBe("notFit");
  });

  it("never approves an unknown walking duration", () => {
    const place = demo();
    place.facts.walkingMinutes.value = "unknown";
    expect(
      evaluatePlace(place, profile({ shortWalk: true }), now).verdict,
    ).toBe("unknown");
  });

  it("ignores unselected companion restrictions", () => {
    expect(
      evaluatePlace(
        demo("east-aquarium"),
        profile({ companions: ["kids"] }),
        now,
      ).verdict,
    ).toBe("fit");
  });
});

describe("evidence freshness", () => {
  const official = (date: string | null): Fact<boolean> => ({
    value: true,
    source: "official",
    verifiedAt: date,
  });
  it("does not turn imported unknown facts into verified admissions", () => {
    const place = demo();
    place.dataMode = "live";
    place.facts = createUnknownFacts();
    expect(evaluatePlace(place, profile(), now).verdict).toBe("unknown");
  });

  it("does not reuse demo evidence on a live place", () => {
    const place = demo();
    place.dataMode = "live";
    expect(evaluatePlace(place, profile(), now).verdict).toBe("unknown");
  });

  it("downgrades long-expired policy evidence to unknown", () => {
    const place = demo();
    place.dataMode = "live";
    for (const fact of Object.values(place.facts)) {
      fact.source = "official";
      fact.verifiedAt = "2026-11-01";
    }
    place.facts.petEntry.verifiedAt = "2026-01-01";
    expect(evaluatePlace(place, profile(), now).verdict).toBe("unknown");
  });

  it("rejects impossible, future and missing dates", () => {
    expect(getFactFreshness(official("2026-02-31"), now)).toBe("missing");
    expect(getFactFreshness(official("2026-12-01"), now)).toBe("missing");
    expect(getFactFreshness(official(null), now)).toBe("missing");
  });

  it("distinguishes fresh, due-soon, stale and demo evidence", () => {
    expect(getFactFreshness(official("2026-11-01"), now)).toBe("fresh");
    expect(getFactFreshness(official("2026-08-20"), now)).toBe("dueSoon");
    expect(getFactFreshness(official("2026-07-01"), now)).toBe("stale");
    expect(
      getFactFreshness({ value: true, source: "demo", verifiedAt: null }, now),
    ).toBe("demo");
  });
});

describe("catalog filters and ranking", () => {
  it("keeps chosen regions and place types together", () => {
    const result = filterAndSortPlaces(
      demoPlaces,
      profile({
        companions: [],
        regions: ["east"],
        types: ["restaurant", "cafe"],
      }),
      { now },
    );
    expect(result.map((match) => match.place.id).sort()).toEqual([
      "east-cafe",
      "east-table",
    ]);
  });

  it("treats zero as free and null as unknown when a budget is applied", () => {
    const free = demo();
    free.price.amount = 0;
    const unknown = demo();
    unknown.id = "unknown-price";
    unknown.price.amount = null;
    const result = filterAndSortPlaces(
      [free, unknown],
      profile({ companions: [], budgets: { restaurant: 0 } }),
      { now },
    );
    expect(result).toHaveLength(1);
    expect(result[0].place.id).toBe(free.id);
  });

  it("applies budgets independently for each type", () => {
    const result = filterAndSortPlaces(
      demoPlaces,
      profile({
        companions: [],
        regions: ["west"],
        budgets: { restaurant: 18000 },
      }),
      { now },
    );
    expect(result.some((match) => match.place.id === "west-table")).toBe(false);
    expect(result.some((match) => match.place.id === "west-stay")).toBe(true);
  });

  it("keeps uncertain candidates by default but excludes hard conflicts", () => {
    const result = filterAndSortPlaces(demoPlaces, profile(), { now });
    expect(result.some((match) => match.place.id === "north-stay")).toBe(true);
    expect(result.some((match) => match.place.id === "east-aquarium")).toBe(
      false,
    );
    const strict = filterAndSortPlaces(demoPlaces, profile(), {
      includeUnknown: false,
      now,
    });
    expect(
      strict.every((match) => match.evaluation.verdict !== "unknown"),
    ).toBe(true);
  });

  it("allows intentional inspection of unsuitable candidates without ranking them above fit places", () => {
    const result = filterAndSortPlaces(
      [demo("east-aquarium"), demo()],
      profile(),
      { includeNotFit: true, sort: "price", now },
    );
    expect(result[0].evaluation.verdict).toBe("fit");
    expect(result[1].evaluation.verdict).toBe("notFit");
  });

  it("never displays closed places even if unsuitable places are included", () => {
    const place = demo();
    place.facts.operating.value = "closed";
    expect(
      filterAndSortPlaces([place], profile(), { includeNotFit: true, now }),
    ).toEqual([]);
  });

  it("searches all available name translations", () => {
    const result = filterAndSortPlaces(
      demoPlaces,
      profile({ companions: [] }),
      { query: "Canola", locale: "en", now },
    );
    expect(result.map((match) => match.place.id)).toEqual(["east-table"]);
  });

  it("provides unique fictional fixtures across all four regions and six place types", () => {
    expect(demoPlaces).toHaveLength(20);
    expect(new Set(demoPlaces.map((place) => place.id)).size).toBe(20);
    expect(new Set(demoPlaces.map((place) => place.region)).size).toBe(4);
    expect(new Set(demoPlaces.map((place) => place.type)).size).toBe(6);
    expect(
      demoPlaces.every(
        (place) => place.dataMode === "demo" && place.verifiedAt === null,
      ),
    ).toBe(true);
  });
});
