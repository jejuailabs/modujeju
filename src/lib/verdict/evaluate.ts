import type {
  Access,
  Companion,
  Evaluation,
  Fact,
  LocalizedText,
  Place,
  PlaceFacts,
  Profile,
  Reason,
  Verdict,
} from "../types";
import {
  ageLimitMessage,
  conditionMessages,
  type ConditionCode,
  walkingMessage,
  weightLimitMessage,
} from "../../messages/conditions";

export const verdictSeverity: Record<Verdict, number> = {
  fit: 0,
  conditional: 1,
  unknown: 2,
  notFit: 3,
};

export function combineVerdicts(verdicts: readonly Verdict[]): Verdict {
  return verdicts.reduce<Verdict>(
    (worst, next) =>
      verdictSeverity[next] > verdictSeverity[worst] ? next : worst,
    "fit",
  );
}

function ageInDays(date: string | null, now: Date): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  )
    return null;
  const days = Math.floor((now.getTime() - time) / 86_400_000);
  return Number.isFinite(days) && days >= 0 ? days : null;
}

export function getFactFreshness(
  fact: Fact<unknown>,
  now = new Date(),
  cycleDays = 90,
): "demo" | "missing" | "fresh" | "dueSoon" | "stale" {
  if (fact.source === "demo") return "demo";
  const days = ageInDays(fact.verifiedAt, now);
  if (days === null || fact.source === "unknown" || fact.value === "unknown")
    return "missing";
  if (days > cycleDays) return "stale";
  if (days >= cycleDays - 14) return "dueSoon";
  return "fresh";
}

function readFact<T>(
  place: Place,
  fact: Fact<T>,
  now: Date,
  cycleDays = 90,
): T | "unknown" {
  if (place.dataMode === "demo" && fact.source === "demo") return fact.value;
  if (fact.source === "demo" || fact.source === "unknown") return "unknown";
  const days = ageInDays(fact.verifiedAt, now);
  // Unverified and long-expired evidence cannot satisfy a mandatory condition.
  if (days === null || days > cycleDays + 90) return "unknown";
  return fact.value;
}

export function evaluatePlace(
  place: Place,
  profile: Profile,
  now = new Date(),
): Evaluation {
  const reasons: Reason[] = [];
  const companionVerdicts: Partial<Record<Companion, Verdict>> = {};
  const push = (
    code: ConditionCode | string,
    verdict: Verdict,
    companion?: Companion,
    factKey?: keyof PlaceFacts,
    message?: LocalizedText,
  ) => {
    reasons.push({
      code,
      verdict,
      message: message ?? conditionMessages[code as ConditionCode],
      ...(companion ? { companion } : {}),
      ...(factKey ? { factKey } : {}),
    });
  };
  const fact = <T>(f: Fact<T>, days = 90) => readFact(place, f, now, days);
  const assessAccess = (
    value: Access | "unknown",
    codes: [ConditionCode, ConditionCode, ConditionCode, ConditionCode],
    companion: Companion | undefined,
    key: keyof PlaceFacts,
  ) => {
    const index =
      value === "yes"
        ? 0
        : value === "conditional"
          ? 1
          : value === "no"
            ? 2
            : 3;
    const verdicts: Verdict[] = ["fit", "conditional", "notFit", "unknown"];
    push(codes[index], verdicts[index], companion, key);
  };

  const operating = fact(place.facts.operating, 60);
  if (operating === "closed" || operating === "suspended")
    push("operatingClosed", "notFit", undefined, "operating");
  else if (operating === "unknown")
    push("operatingUnknown", "unknown", undefined, "operating");

  if (profile.companions.includes("kids")) {
    const entry = fact(place.facts.kidsEntry);
    assessAccess(
      entry,
      ["kidsAllowed", "kidsConditional", "kidsDenied", "kidsUnknown"],
      "kids",
      "kidsEntry",
    );
    if (entry !== "no") {
      const minAge = fact(place.facts.minAge);
      const age = profile.childAge;
      if (minAge === "unknown")
        push("childAgeUnknown", "unknown", "kids", "minAge");
      else if (minAge !== null && minAge > 0) {
        if (age === null || !Number.isFinite(age) || age < 0)
          push("childAgeMissing", "conditional", "kids", "minAge");
        else
          push(
            "childAgeLimit",
            age < minAge ? "notFit" : "fit",
            "kids",
            "minAge",
            ageLimitMessage(minAge),
          );
      }
      if (
        fact(place.facts.highChair, 365) === true &&
        ["restaurant", "cafe"].includes(place.type)
      )
        push("highChair", "fit", "kids", "highChair");
    }
  }

  if (profile.stroller)
    assessAccess(
      fact(place.facts.stroller, 365),
      ["strollerYes", "strollerConditional", "strollerNo", "strollerUnknown"],
      "kids",
      "stroller",
    );

  if (profile.companions.includes("pet")) {
    const entry = fact(place.facts.petEntry);
    if (entry === "no") push("petDenied", "notFit", "pet", "petEntry");
    else if (entry === "unknown")
      push("petUnknown", "unknown", "pet", "petEntry");
    else {
      push(
        entry === "indoor"
          ? "petIndoor"
          : profile.indoorPet
            ? "petIndoorRequired"
            : "petOutdoor",
        entry === "indoor"
          ? "fit"
          : profile.indoorPet
            ? "notFit"
            : "conditional",
        "pet",
        "petEntry",
      );
      const limit = fact(place.facts.dogMaxWeight);
      if (limit === "unknown")
        push("weightUnknown", "unknown", "pet", "dogMaxWeight");
      else if (limit !== null) {
        const weight = profile.dogWeight;
        const inclusive = fact(place.facts.dogWeightInclusive);
        if (weight === null || !Number.isFinite(weight) || weight <= 0)
          push("weightMissing", "conditional", "pet", "dogMaxWeight");
        else if (weight === limit && inclusive === "unknown")
          push("weightBoundaryUnknown", "unknown", "pet", "dogWeightInclusive");
        else {
          const matches =
            weight < limit || (weight === limit && inclusive === true);
          push(
            "weightLimit",
            matches ? "fit" : "notFit",
            "pet",
            "dogMaxWeight",
            weightLimitMessage(limit, inclusive),
          );
        }
      }
      const carrier = fact(place.facts.carrierRequired);
      if (carrier === true)
        push("carrierRequired", "conditional", "pet", "carrierRequired");
      else if (carrier === "unknown")
        push("carrierUnknown", "unknown", "pet", "carrierRequired");
    }
  }

  if (profile.stepFree)
    assessAccess(
      fact(place.facts.stepFree, 365),
      ["stepFreeYes", "stepFreeConditional", "stepFreeNo", "stepFreeUnknown"],
      profile.companions.includes("senior") ? "senior" : undefined,
      "stepFree",
    );

  if (profile.shortWalk) {
    const walking = fact(place.facts.walkingMinutes, 365);
    const who = profile.companions.includes("senior") ? "senior" : undefined;
    if (walking === "unknown" || walking === null)
      push("shortWalkUnknown", "unknown", who, "walkingMinutes");
    else if (walking > 30) push("shortWalkNo", "notFit", who, "walkingMinutes");
    else
      push(
        "shortWalkYes",
        "fit",
        who,
        "walkingMinutes",
        walkingMessage(walking),
      );
  }

  if (profile.companions.includes("senior")) {
    const seating = fact(place.facts.seating, 365);
    if (seating === "table" || seating === "mixed")
      push("tableSeating", "fit", "senior", "seating");
    // Being older is not itself a stair, floor-seating or walking restriction.
    if (!profile.stepFree && !profile.shortWalk)
      push("needsOptional", "fit", "senior");
  }

  for (const companion of profile.companions) {
    companionVerdicts[companion] = combineVerdicts(
      reasons
        .filter((reason) => reason.companion === companion)
        .map((reason) => reason.verdict),
    );
  }
  // Critical restrictions precede reassuring feature tags in the UI.
  reasons.sort(
    (a, b) => verdictSeverity[b.verdict] - verdictSeverity[a.verdict],
  );
  return {
    verdict: combineVerdicts(reasons.map((reason) => reason.verdict)),
    reasons,
    companionVerdicts,
    isDemo: place.dataMode === "demo",
  };
}
