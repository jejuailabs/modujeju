import { describe, expect, it } from "vitest";
import { createUnknownFacts, type Place } from "@/lib/types";
import { prepareUpsert } from "./merge";
import { sourceHash } from "./hash";

const labels = { ko: "원문", en: "원문", zh: "원문", ja: "원문" };
const place: Place = { id: "vj-A", slug: "vj-a", name: labels, address: labels, summary: labels, district: labels, type: "cafe", region: "north", lat: null, lng: null, durationMinutes: null, image: "/assets/icons/map-pin.svg", imageKind: "placeholder", price: { amount: null, unit: "drink", petExtra: null }, facts: createUnknownFacts(), sourceId: "A", sourceUrl: "https://www.visitjeju.net/kr/detail/view?contentsid=A", verifiedAt: null, dataMode: "live" };
const candidate = { sourceId: "A", sourceHash: sourceHash({ id: "A", value: 1 }), draft: { place } };
const now = "2026-11-08T00:00:00Z";

describe("source upsert and editorial preservation", () => {
  it("makes new basic source data available while retaining a draft editorial document", () => {
    const result = prepareUpsert(null, null, candidate, now, "scan");
    expect(result.source).toMatchObject({ eligible: true, revision: 1, place: { dataMode: "live", verifiedAt: null, imageKind: "placeholder" } });
    expect(result.document).toMatchObject({ status: "draft", imageRights: { status: "placeholder" } });
  });
  it("preserves reviewed policy, price, photo, location and publication while refreshing basic source fields", () => {
    const first = prepareUpsert(null, null, candidate, now, "scan");
    const verifiedFacts = { ...place.facts, petEntry: { value: "no", source: "phone", verifiedAt: "2026-11-08" } };
    const existing = { ...first.document, status: "published", price: { amount: 6000, unit: "drink", petExtra: 2000 }, facts: verifiedFacts, image: "https://photo.example/authorized.jpg", imageKind: "photo", imageRights: { status: "permitted", credit: "owner", license: "permission" }, verifiedAt: "2026-11-08", slug: "manual-slug", internalNotes: "private" };
    const changed = { ...candidate, sourceHash: sourceHash({ id: "A", value: 2 }), draft: { place: { ...place, name: { ...labels, ko: "바뀐 상호" }, address: { ...labels, ko: "이전한 주소" }, region: "east" as const } } };
    const result = prepareUpsert(existing, first.source, changed, now, "scan-two");
    expect(result.document).toMatchObject({ status: "published", facts: verifiedFacts, price: existing.price, image: existing.image, imageRights: existing.imageRights, verifiedAt: existing.verifiedAt, slug: "manual-slug", name: changed.draft.place.name, address: place.address, region: "north", internalNotes: "private", sourceReviewRequired: true });
    expect(result.source).toMatchObject({ editorialReviewRequired: true, changedEditorialFields: ["address", "region"], revision: 2 });
  });
  it("does not rewrite the editorial document when the source hash is unchanged", () => {
    const first = prepareUpsert(null, null, candidate, now, "one");
    const again = prepareUpsert(first.document, first.source, candidate, "2026-11-09T00:00:00Z", "two");
    expect(again.document).toBeNull(); expect(again.outcome).toBe("unchanged");
    expect(again.source).toMatchObject({ revision: 1, lastSeenScanId: "two", changedAt: now });
  });
  it("does not give an automated provider authority over initial facts, prices or images", () => {
    const injected = { ...candidate, draft: { place: { ...place, image: "https://unreviewed.example/photo.jpg", imageKind: "photo" as const, price: { amount: 0, unit: "drink" as const, petExtra: 0 }, facts: { ...place.facts, petEntry: { value: "indoor" as const, source: "official" as const, verifiedAt: "2026-11-08" } } } } };
    const result = prepareUpsert(null, null, injected, now, "one");
    expect(result.source.place.facts.petEntry.value).toBe("unknown"); expect(result.source.place.price.amount).toBeNull(); expect(result.source.place.imageKind).toBe("placeholder");
  });
  it("refuses a content-ID collision rather than overwriting another place", () => {
    expect(() => prepareUpsert({ ...place, sourceId: "OTHER" }, null, candidate, now, "one")).toThrow();
  });
});
