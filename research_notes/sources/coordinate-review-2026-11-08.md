# Coordinate review — 2026-11-08

66 VisitJeju public-listing records had no coordinates. Four attraction positions
were matched to Wikimedia article identities and downloaded from Wikidata's
public Action API. The reviewed cache is `../catalog/coordinates.json`; the app
reads this cache without issuing map searches or geocoding requests at runtime.

| Catalog name | Wikidata identity | Identity check |
|---|---|---|
| 비자림 | [Q16094611](https://www.wikidata.org/wiki/Q16094611) | Korean Wikipedia redirects 비자림 to 제주 평대리 비자나무 숲, in 구좌읍 평대리 |
| 천지연폭포 | [Q626162](https://www.wikidata.org/wiki/Q626162) | Korean name and Seogwipo waterfall description match; distinct from 천제연폭포 |
| 협재해수욕장 | [Q12625130](https://www.wikidata.org/wiki/Q12625130) | Korean article identifies 한림읍 협재리 and links to VisitJeju |
| 성산일출봉 | [Q122225](https://www.wikidata.org/wiki/Q122225) | Korean article and linked protected-area identity match Seongsan-ri, Seogwipo |

All four coordinates represent the named place, **not a verified entrance,
parking lot, wheelchair approach, or navigable destination**. `place-center`
describes this place-level reference point, not a surveyed geometric centroid.
Coordinates are independent of companion conditions and do not set any facility
fact or `verifiedAt`. Street addresses in the cache are identity guards against
later catalog changes; they are not a claim that Wikidata verified that street
address. The actual identity match uses article names and the stated locality.

The coordinate values were copied from P625 of the exact Wikidata identities.
Raw successful responses are `wikipedia-coordinates-2026-11-08.json` (GeoData
coordinates and Wikidata IDs) and `wikidata-coordinates-2026-11-08.json` (P625).
The two sources have small coordinate differences for some landmarks; the cache
consistently uses Wikidata P625 and labels that source.

The two other attractions remain unresolved: the 오설록 티 뮤지엄 article redirects
to the tea company Q16098850, which has no P625, so it was rejected; 카멜리아힐 had
no matching Korean article. The other 60 restaurant/cafe/stay records also retain
null positions. No approximate coordinates or region centers were assigned.

## Public service access and license

- [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access)
  offers public CC0 data and documents Action API batches of up to 50 entities.
  These were small unauthenticated read batches, with a project-identifying
  User-Agent and `maxlag=5`. No Enterprise service, account or paid service used.
- [Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing): structured
  entity data is CC0. Source links are retained even though attribution is not required.
- [Wikimedia API usage](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_API_Usage_Guidelines):
  respect throttling and content licenses; no excessive concurrent use.
- [GeoData](https://www.mediawiki.org/wiki/Extension:GeoData) documents
  `action=query&prop=coordinates`, used to resolve the six article candidates.

## Unsuccessful OSM lookup

[Private.coffee Overpass](https://overpass.private.coffee/) explicitly permits
free use, including commercial applications, subject to fair load and OSM license
requirements. One POST query for 66 catalog name candidates timed out after 60s;
a browser GET follow-up also did not return a usable result. No OSM coordinates
were recovered and no recurring retries or runtime dependency were added. The
attempted query is `osm-poi-query-2026-11-08.txt`. Nominatim was not used.
