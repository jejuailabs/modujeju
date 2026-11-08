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

export const realPlaces = [...basePlaces, ...companionPlaces];
