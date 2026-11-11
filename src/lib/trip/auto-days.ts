import { MAX_TRIP_DAYS } from "./state";

/**
 * Suggested trip length for an automatic plan: enough days that a day keeps
 * to the planner's pace (3 stops with kids or a short-walk need, otherwise 4),
 * never fewer than one night and never beyond the product limit.
 */
export function suggestedTripDays(daytimeSpotCount: number, relaxedPace: boolean): number {
  const perDay = relaxedPace ? 3 : 4;
  const count = Number.isFinite(daytimeSpotCount) ? Math.max(0, Math.floor(daytimeSpotCount)) : 0;
  return Math.min(MAX_TRIP_DAYS, Math.max(2, Math.ceil(count / perDay)));
}
