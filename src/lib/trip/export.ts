import type { Locale, Place } from "../types";
import { normalizeTravelData, tripDayDate, type TravelData } from "./state";

/** Exports the user's ordering, never invented opening or driving times. */
export function itineraryJsonExport(
  data: TravelData,
  places: readonly Place[],
  locale: Locale = "ko",
  exportedAt: Date = new Date(),
): string {
  const clean = normalizeTravelData(data);
  const byId = new Map(places.map((place) => [place.id, place]));
  const days = Array.from({ length: clean.tripDays }, (_, index) => {
    const day = index + 1;
    const ids = clean.itinerary[String(day)] ?? [];
    return {
      day,
      date: tripDayDate(clean.tripStartDate, day),
      places: ids.flatMap((id) => {
        const place = byId.get(id);
        return place
          ? [
              {
                id: place.id,
                name: place.name[locale],
                address: place.address[locale],
                region: place.region,
                type: place.type,
                latitude: place.lat,
                longitude: place.lng,
                dataMode: place.dataMode,
              },
            ]
          : [];
      }),
      unavailablePlaceIds: ids.filter((id) => !byId.has(id)),
    };
  });
  return JSON.stringify(
    {
      format: "modujeju-itinerary",
      version: 1,
      exportedAt: exportedAt.toISOString(),
      locale,
      tripStartDate: clean.tripStartDate || null,
      days,
    },
    null,
    2,
  );
}
