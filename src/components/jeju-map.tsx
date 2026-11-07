"use client";
import { useState } from "react";
import { MapPin, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Locale, Place } from "@/lib/types";
import { copy, priceLabel } from "@/messages/ui";
import { catalogCopy } from "@/messages/catalog";
import { OsmMap, hasPlaceCoordinates } from "./osm-map";
export function JejuMap({
  locale,
  places,
}: {
  locale: Locale;
  places: Place[];
}) {
  const c = copy(locale),
    [selected, setSelected] = useState<string | null>(null),
    place = places.find((p) => p.id === selected);
  const t = catalogCopy(locale);
  const mappedPlaces = places.filter(hasPlaceCoordinates);
  const unmappedPlaces = places.filter((p) => !hasPlaceCoordinates(p));
  return (
    <div className="map-panel">
      <p className="map-note">
        <MapPin size={16} />
        {places.some((p) => p.dataMode === "demo") ? c.mapNote : t.mapOverview}
      </p>
      <OsmMap locale={locale} places={places} selectedId={selected} onSelect={setSelected} />
      {place ? (
        <div className="map-place">
          <div>
            <small>
              {c[place.region]} · {c[place.type]}
            </small>
            <h3>{place.name[locale]}</h3>
            <p>{priceLabel(place, locale)}</p>
            {place.coordinateSource && <a className="text-link" href={place.coordinateSource.sourceUrl} target="_blank" rel="noopener noreferrer">{t.coordinateSource} · {place.coordinateSource.sourceName}<ArrowUpRight size={13} /></a>}
          </div>
          <Link
            href={`/${locale}/places/${place.slug}`}
            className="btn secondary"
          >
            {c.openPlace}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="map-key">
          {mappedPlaces.map((p, i) => (
            <button key={p.id} onClick={() => setSelected(p.id)}>
              <span>{i + 1}</span>
              {p.name[locale]}
            </button>
          ))}
        </div>
      )}
      {unmappedPlaces.length > 0 && <div className="map-addresses">
        <p className="notice">{t.noCoordinates}</p>
        {unmappedPlaces.map((p) => <div className="map-address" key={p.id}>
          <div><Link href={`/${locale}/places/${p.slug}`}><strong>{p.name[locale]}</strong></Link><p>{p.address[locale]}</p></div>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name.ko} ${p.address.ko}`)}`} target="_blank" rel="noopener noreferrer" className="text-link">{t.addressMap}<ArrowUpRight size={16} /></a>
        </div>)}
      </div>}
    </div>
  );
}
