import type { CatalogOptions, Place, PlaceMatch, Profile } from "./types";
import { evaluatePlace, verdictSeverity } from "./verdict/evaluate";

/** Budgets compare the stated base-price unit, not a guessed party total. */
export function filterAndSortPlaces(
  places: readonly Place[],
  profile: Profile,
  options: CatalogOptions = {},
): PlaceMatch[] {
  const locale = options.locale ?? "ko";
  const query = options.query?.trim().toLocaleLowerCase(locale) ?? "";
  const collator = new Intl.Collator(locale);
  const result = places
    .filter((place) => {
      if (
        place.facts.operating.value === "closed" ||
        place.facts.operating.value === "suspended"
      )
        return false;
      if (profile.regions.length && !profile.regions.includes(place.region))
        return false;
      if (profile.types.length && !profile.types.includes(place.type))
        return false;
      const budget = profile.budgets[place.type];
      if (
        budget !== undefined &&
        Number.isFinite(budget) &&
        (place.price.amount === null || place.price.amount > budget)
      )
        return false;
      if (
        query &&
        ![
          ...Object.values(place.name),
          ...Object.values(place.district),
          ...Object.values(place.summary),
        ].some((value) => value.toLocaleLowerCase(locale).includes(query))
      )
        return false;
      return true;
    })
    .map((place) => ({
      place,
      evaluation: evaluatePlace(place, profile, options.now),
    }))
    .filter(({ evaluation }) => {
      if (!options.includeNotFit && evaluation.verdict === "notFit")
        return false;
      if (options.includeUnknown === false && evaluation.verdict === "unknown")
        return false;
      return true;
    });

  return result.sort((a, b) => {
    const suitability =
      verdictSeverity[a.evaluation.verdict] -
      verdictSeverity[b.evaluation.verdict];
    if (suitability) return suitability;
    if (options.sort === "price") {
      // Different price units are incomparable; group them rather than comparing a drink to a night.
      const unitOrder = { person: 0, drink: 1, night: 2 };
      const unit =
        unitOrder[a.place.price.unit] - unitOrder[b.place.price.unit];
      if (unit) return unit;
      const price =
        (a.place.price.amount ?? Infinity) - (b.place.price.amount ?? Infinity);
      if (price) return price;
    }
    if (
      options.sort === "duration" &&
      a.place.durationMinutes !== b.place.durationMinutes
    )
      return a.place.durationMinutes - b.place.durationMinutes;
    if (options.sort !== "name") {
      const verification = (b.place.verifiedAt ?? "").localeCompare(
        a.place.verifiedAt ?? "",
      );
      if (verification) return verification;
    }
    return (
      collator.compare(a.place.name[locale], b.place.name[locale]) ||
      a.place.id.localeCompare(b.place.id)
    );
  });
}

export function getPlaceBySlug(
  places: readonly Place[],
  slug: string,
): Place | undefined {
  return places.find((place) => place.slug === slug || place.id === slug);
}
