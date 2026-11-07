"use client";
import { useState } from "react";
import { MapPin, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Locale, Place } from "@/lib/types";
import { copy, priceLabel } from "@/messages/ui";
import { catalogCopy } from "@/messages/catalog";
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
  const mappedPlaces = places.filter((p): p is Place & { lat: number; lng: number } => typeof p.lat === "number" && typeof p.lng === "number");
  const unmappedPlaces = places.filter((p) => p.lat === null || p.lng === null);
  return (
    <div className="map-panel">
      <p className="map-note">
        <MapPin size={16} />
        {places.some((p) => p.dataMode === "demo") ? c.mapNote : t.mapOverview}
      </p>
      <div className="map-canvas">
        <svg viewBox="0 0 720 430" role="img" aria-label={c.map}>
          <defs>
            <pattern
              id="waves"
              width="44"
              height="26"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 13 Q11 6 22 13 T44 13"
                fill="none"
                stroke="currentColor"
                strokeWidth=".7"
              />
            </pattern>
            <linearGradient id="island" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#e8edc5" />
              <stop offset="1" stopColor="#bbd5b6" />
            </linearGradient>
          </defs>
          <rect width="720" height="430" fill="url(#waves)" opacity=".18" />
          <path
            d="M90 243 C80 201 134 160 196 135 C238 113 281 92 340 91 C403 76 444 87 497 89 C560 94 623 110 642 146 C664 182 618 220 583 245 C547 281 497 310 434 326 C365 346 307 344 249 330 C193 323 126 299 90 243Z"
            fill="url(#island)"
            stroke="#a5bd9a"
            strokeWidth="2"
          />
          <path
            d="M139 230 C194 174 306 129 423 126 S583 142 596 162 C554 241 401 310 287 292 S168 273 139 230Z"
            fill="none"
            stroke="#fff8e9"
            strokeWidth="4"
            strokeDasharray="8 8"
          />
          <path d="M306 229 L352 163 L400 229Z" fill="#9fb593" opacity=".7" />
          <path d="M339 181 L352 163 L366 183 L354 179Z" fill="#f7f8e6" />
          <text
            x="352"
            y="254"
            textAnchor="middle"
            fill="#4c6954"
            fontSize="13"
          >
            HALLASAN
          </text>
          <text x="340" y="69" textAnchor="middle" className="map-region">
            {c.north}
          </text>
          <text x="570" y="291" textAnchor="middle" className="map-region">
            {c.east}
          </text>
          <text x="150" y="162" textAnchor="middle" className="map-region">
            {c.west}
          </text>
          <text x="340" y="375" textAnchor="middle" className="map-region">
            {c.south}
          </text>
        </svg>
        {mappedPlaces.map((p, i) => {
          const x = Math.max(12, Math.min(88, ((p.lng - 126.12) / 0.85) * 100));
          const y = Math.max(20, Math.min(77, ((33.6 - p.lat) / 0.42) * 100));
          return (
            <button
              key={p.id}
              className={`map-pin ${selected === p.id ? "selected" : ""}`}
              style={{ left: x + "%", top: y + "%" }}
              aria-label={p.name[locale]}
              aria-pressed={selected === p.id}
              onClick={() => setSelected(p.id)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      {place ? (
        <div className="map-place">
          <div>
            <small>
              {c[place.region]} · {c[place.type]}
            </small>
            <h3>{place.name[locale]}</h3>
            <p>{priceLabel(place, locale)}</p>
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
