import type { Companion, Place } from "./types";
import { getPlaceFeatures, type FeatureStatus } from "./place-features";

export type CompanionStatuses = Record<Companion, FeatureStatus>;
export type CombineMode = "and" | "or";

/** Per-companion status from verified evidence only. Unknown stays unknown. */
export function companionStatuses(place: Place, now?: Date): CompanionStatuses {
  const features = getPlaceFeatures(place, { now });
  const status = (key: Companion): FeatureStatus => features.find((feature) => feature.key === key)?.status ?? "unknown";
  return { kids: status("kids"), pet: status("pet"), senior: status("senior") };
}

/**
 * AND: every selected companion must be confirmed (or conditional when allowed).
 * OR: at least one. No selection keeps every place. "no" and "unknown" never match.
 */
export function matchesCompanions(
  statuses: CompanionStatuses,
  selected: readonly Companion[],
  mode: CombineMode,
  includeConditional: boolean,
): boolean {
  if (!selected.length) return true;
  const passes = (companion: Companion) =>
    statuses[companion] === "yes" || (includeConditional && statuses[companion] === "conditional");
  return mode === "and" ? selected.every(passes) : selected.some(passes);
}
