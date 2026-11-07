import type { PlaceType } from "./types";

export const browsePlaceTypes = ["restaurant", "cafe", "stay", "attraction"] as const;
export type BrowsePlaceType = (typeof browsePlaceTypes)[number];

/** Experiences and walks remain available under the sightseeing category. */
export function browseCategory(type: PlaceType): BrowsePlaceType {
  return type === "experience" || type === "walk" ? "attraction" : type;
}
