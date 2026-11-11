import { describe, expect, it } from "vitest";
import { realPlaces, outingPlaces } from "./catalog";
import { toPublicPlace } from "@/lib/server/place-schema";
import { getPlaceFeatures } from "@/lib/place-features";

const now = new Date("2026-11-08T03:00:00Z");
const find = (sourceId: string) => {
  const result = realPlaces.find(place => place.sourceId === sourceId);
  if (!result) throw new Error(`Missing researched spot: ${sourceId}`);
  return result;
};

describe("expanded companion catalog", () => {
  it("publishes unique researched outings and per-item source links through the public schema", () => {
    expect(outingPlaces).toHaveLength(13);
    expect(new Set(realPlaces.map(place => place.sourceId)).size).toBe(realPlaces.length);
    expect(new Set(realPlaces.map(place => place.slug)).size).toBe(realPlaces.length);
    for (const place of outingPlaces) {
      expect(new URL(place.sourceUrl!).searchParams.get("contentsid")).toBe(place.sourceId);
      expect(place.sourceObservations!.length).toBeGreaterThanOrEqual(3);
      expect(place.price.amount).toBeNull();
      expect(toPublicPlace(place)?.sourceObservations).toEqual(place.sourceObservations);
    }
    expect(realPlaces.every(place => toPublicPlace(place) !== null)).toBe(true);
  });

  it("keeps conflicting pet weight limits unknown and retains the reasons", () => {
    const somerset = find("CNTS_000000000022768");
    expect(somerset.facts.dogWeightInclusive.value).toBe("unknown");
    const sonocalm = find("CNTS_000000000020789");
    expect(sonocalm.facts.dogMaxWeight.value).toBe("unknown");
    expect(find("CONT_000000000500690").facts.petEntry.value).toBe("unknown");
    expect(somerset.sourceObservations?.some(note => note.value.includes("10kg"))).toBe(true);
  });

  it("publishes API coordinates and contact details while retaining the separate companion review date", () => {
    const museum = toPublicPlace(find("CONT_000000000500578"));
    expect(museum).toMatchObject({
      lat: 33.30413,
      lng: 126.299675,
      coordinateSource: { sourceName: "비짓제주 관광정보 API", checkedAt: "2026-11-11", kind: "place-center" },
      facts: { kidsEntry: { value: "yes", verifiedAt: "2026-11-08", sourceUrl: "https://www.jdc-jam.com/exhibit/child.do" } },
    });
    expect(museum?.sourceObservations).toContainEqual({
      field: "visitJejuPhone", value: "064-800-2000", verifiedAt: "2026-11-11",
      sourceUrl: "https://www.visitjeju.net/kr/detail/view?contentsid=CONT_000000000500578",
    });

    const guesthouse = toPublicPlace(find("CNTS_300000000014073"));
    expect(guesthouse).toMatchObject({ name: { ko: "금배네민박" }, lat: null, lng: null });
    expect(guesthouse?.coordinateSource).toBeUndefined();
  });

  it("preserves outdoor restrictions and excludes unconfirmed pet rules", () => {
    const hueree = find("CONT_000000000500707");
    expect(hueree.facts.petEntry.value).toBe("outdoor");
    expect(hueree.facts.dogMaxWeight.value).toBe(7);
    expect(hueree.facts.dogWeightInclusive.value).toBe(false);
    expect(hueree.facts.petEntry.note?.ko).toContain("일부 야외");
    expect(find("CONT_000000000500270").facts.petEntry.value).toBe("no");
    expect(find("CONT_000000000500457").facts.petEntry.value).toBe("unknown");
  });

  it("exposes supported facilities without promising access across an entire attraction", () => {
    const waterfall = find("CONT_000000000500618");
    const features = getPlaceFeatures(waterfall, { now });
    expect(features.find(feature => feature.key === "nursingRoom")?.status).toBe("yes");
    expect(features.find(feature => feature.key === "stepFree")?.status).toBe("conditional");
    expect(waterfall.facts.stepFree.value).toBe("unknown");
    expect(waterfall.sourceObservations?.some(note => note.sourceUrl.includes("access.visitkorea.or.kr"))).toBe(true);
  });
});
