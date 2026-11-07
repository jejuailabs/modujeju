import { mapOfficialCatalog } from "@/lib/official-catalog";
import { applyCatalogCoordinates } from "@/lib/catalog-coordinates";
import { applyCatalogFacts } from "./catalog-facts";
import restaurants from "../../research_notes/catalog/restaurants.json";
import cafes from "../../research_notes/catalog/cafes.json";
import stays from "../../research_notes/catalog/stays.json";
import attractions from "../../research_notes/catalog/attractions.json";
import coordinates from "../../research_notes/catalog/coordinates.json";

// Public official pages observed on 2026-11-08. This is a sourced snapshot,
// not a live API sync. Unknown admission rules and prices remain unknown.
export const realPlaces = applyCatalogCoordinates(
  applyCatalogFacts(mapOfficialCatalog([...restaurants, ...cafes, ...stays, ...attractions])),
  coordinates,
);
