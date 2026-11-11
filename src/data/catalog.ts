import { mapOfficialCatalog } from "@/lib/official-catalog";
import { applyCatalogCoordinates } from "@/lib/catalog-coordinates";
import { applyCatalogPhotos } from "@/lib/catalog-photos";
import { applyCatalogFacts } from "./catalog-facts";
import restaurants from "../../research_notes/catalog/restaurants.json";
import cafes from "../../research_notes/catalog/cafes.json";
import stays from "../../research_notes/catalog/stays.json";
import attractions from "../../research_notes/catalog/attractions.json";
import coordinates from "../../research_notes/catalog/coordinates.json";
import photos from "../../research_notes/catalog/photos.json";
import companionSpots from "../../research_notes/catalog/companion-spots.json";
import companionPhotos from "../../research_notes/catalog/companion-photos.json";
import researchedOutings from "../../research_notes/catalog/researched-outings.json";
import companionEnrichment from "../../research_notes/catalog/companion-enrichment.json";
import { applyCompanionEnrichment } from "@/lib/companion-enrichment";
import { applyListingAmenities } from "@/lib/listing-amenities";
import type { Place } from "@/lib/types";
import apiDetails from "../../research_notes/catalog/visitjeju-api-details.json";
import mommomSpots from "../../research_notes/catalog/mommom-spots.json";
import mommomPhotos from "../../research_notes/catalog/mommom-photos.json";
import mommomAmenities from "../../research_notes/catalog/mommom-amenities.json";
import publicSourceSpots from "../../research_notes/catalog/public-source-spots.json";
import publicSourcePhotos from "../../research_notes/catalog/public-source-photos.json";
import publicSourceEnrichment from "../../research_notes/catalog/public-source-enrichment.json";
import visitJejuFacilities from "../../research_notes/catalog/visitjeju-facilities.json";

// Public official pages observed on 2026-11-08. This is a sourced snapshot,
// not a live API sync. Unknown admission rules and prices remain unknown.
export const basePlaces = applyCatalogPhotos(
  applyCatalogCoordinates(
    applyCatalogFacts(mapOfficialCatalog([...restaurants, ...cafes, ...stays, ...attractions])),
    coordinates,
  ),
  photos,
);

// Spots found by companion-focused research (kids, dogs, seniors). Their
// facilities and admissions stay hidden until an operator stamps verifiedAt
// (scripts/approve-companion-spots.mjs).
export const companionPlaces = applyCatalogPhotos(mapOfficialCatalog(companionSpots), companionPhotos);

const baseIds = new Set(basePlaces.map((place) => place.id));
if (companionPlaces.some((place) => baseIds.has(place.id))) throw new Error("DUPLICATE_COMPANION_LISTING");

export const outingPlaces = mapOfficialCatalog(researchedOutings);

// VisitJeju restaurants, cafes and stays that a family travel app (맘맘)
// lists with dated facility entries. Basics come from VisitJeju; facilities
// are filled from mommom-amenities.json and stay hidden until approved
// (scripts/approve-listing-amenities.mjs).
export const listingPlaces = applyCatalogPhotos(mapOfficialCatalog(mommomSpots), mommomPhotos);

// VisitJeju places matched to public companion sources: 이지제주 accessibility
// survey, 식품안전나라 pet-entry restaurants and VisitJeju pet tags. Their
// patches (public-source-enrichment.json) stay hidden until approved
// (scripts/approve-public-sources.mjs).
export const publicSourcePlaces = applyCatalogPhotos(mapOfficialCatalog(publicSourceSpots), publicSourcePhotos);
const allPlaces = [...basePlaces, ...companionPlaces, ...outingPlaces, ...listingPlaces, ...publicSourcePlaces];
if (new Set(allPlaces.map(place => place.id)).size !== allPlaces.length) throw new Error("DUPLICATE_RESEARCHED_LISTING");

// Supplemental official sources override only explicitly reviewed fields.
// Keep the original snapshots intact for audit and future API refreshes.
const apiById = new Map(apiDetails.records.map(record => [record.sourceId, record]));
if (apiById.size !== apiDetails.records.length) throw new Error("DUPLICATE_VISITJEJU_API_DETAILS");

// Order matters: reviewed research first, then VisitJeju API facilities, then
// other public sources (newer approved official evidence may replace older),
// then app listings fill what is left.
// VisitJeju official API text (intro, phone, addresses, facility tags) and
// its facility icons apply to every catalog place that the API lists.
const enriched = [visitJejuFacilities, publicSourceEnrichment].reduce(
  (current: Place[], patches: readonly unknown[]) => applyCompanionEnrichment(current, patches),
  applyCompanionEnrichment(allPlaces, companionEnrichment),
);
export const realPlaces: Place[] = applyListingAmenities(enriched, mommomAmenities).map(place => {
  const record = apiById.get(place.sourceId ?? "");
  if (!record) return place;
  if (record.title !== place.name.ko || !place.sourceUrl) throw new Error("VISITJEJU_API_IDENTITY_MISMATCH");

  const result = { ...place };
  if (record.lat !== null && record.lng !== null) {
    result.lat = record.lat;
    result.lng = record.lng;
    result.coordinateSource = {
      sourceName: "비짓제주 관광정보 API",
      sourceUrl: place.sourceUrl,
      checkedAt: apiDetails.checkedAt,
      kind: "place-center",
    };
  }
  // Personal mobile numbers (010) are not published without the owner's consent.
  if (record.phone && !/^010/.test(record.phone.replace(/\s/g, ""))) {
    result.sourceObservations = [...(place.sourceObservations ?? []), {
      field: "visitJejuPhone",
      value: record.phone,
      sourceUrl: place.sourceUrl,
      verifiedAt: apiDetails.checkedAt,
    }];
  }
  return result;
});
