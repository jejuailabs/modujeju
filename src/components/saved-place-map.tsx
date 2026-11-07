"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { type Locale, type Place, type Region } from "@/lib/types";
import { browseCategory } from "@/lib/place-categories";
import { copy } from "@/messages/ui";
import { savedMessages } from "@/messages/saved";
import { catalogCopy } from "@/messages/catalog";
import { PlaceFeatures } from "./place-features";
import { OsmMap, hasPlaceCoordinates } from "./osm-map";
import styles from "./saved-view.module.css";

export function SavedPlaceMap({ locale, places }: { locale: Locale; places: Place[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const c = copy(locale);
  const t = savedMessages[locale];
  const withoutCoordinates = places.filter((place) => !hasPlaceCoordinates(place));
  const activeRegion = region && withoutCoordinates.some((place) => place.region === region) ? region : null;
  const options = activeRegion ? withoutCoordinates.filter((place) => place.region === activeRegion) : places;
  const selected = options.find((place) => place.id === selectedId) ?? options[0];

  return (
    <div className={styles.mapLayout}>
      <div className={styles.mapSurface}>
        <OsmMap locale={locale} places={places} selectedId={selected?.id} selectedRegion={activeRegion}
          onSelect={(id) => { setRegion(null); setSelectedId(id); }}
          onSelectRegion={(nextRegion) => { setRegion(nextRegion); setSelectedId(withoutCoordinates.find((place) => place.region === nextRegion)?.id ?? null); }} />
      </div>
      <div className={styles.mapDetails}>
        {activeRegion && <div className={styles.groupHeading}><strong>{c[activeRegion]} · {options.length} {c.countSuffix}</strong><button type="button" onClick={() => setRegion(null)}>{t.showAll}</button></div>}
        {activeRegion && <p className={styles.groupHint}>{t.groupHint}</p>}
        <label className={styles.placeSelect}>{t.selectPlace}<select value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{options.map((place) => <option key={place.id} value={place.id}>{c[browseCategory(place.type)]} · {place.name[locale]}</option>)}</select></label>
        {activeRegion && <ul className={styles.groupList}>{options.map((place) => <li key={place.id}><button type="button" aria-pressed={selected?.id === place.id} onClick={() => setSelectedId(place.id)}><span>{place.name[locale]}</span><small>{c[browseCategory(place.type)]}</small></button></li>)}</ul>}
        {selected && <article key={selected.id} className={styles.selectedPlace}>
          <div className={styles.selectedHeading}>
            {selected.image && selected.imageKind !== "placeholder" && <Image src={selected.image} width={72} height={72} alt="" className={styles.selectedPhoto} />}
            <div><div className={styles.selectedMeta}>{c[browseCategory(selected.type)]}<span>·</span>{c[selected.region]}</div><h3><Link href={`/${locale}/places/${selected.slug}`}>{selected.name[locale]}<ArrowUpRight size={21} aria-hidden="true" /></Link></h3></div>
          </div>
          <p className={styles.selectedAddress}><MapPin size={15} aria-hidden="true" />{selected.address[locale]}</p>
          {selected.coordinateSource && <a className={styles.externalMap} href={selected.coordinateSource.sourceUrl} target="_blank" rel="noopener noreferrer">{catalogCopy(locale).coordinateSource} · {selected.coordinateSource.sourceName}<ArrowUpRight size={13} aria-hidden="true" /></a>}
          <PlaceFeatures place={selected} locale={locale} compact />
          <Link className={`btn primary ${styles.detailLink}`} href={`/${locale}/places/${selected.slug}`}>{c.openPlace}<ArrowUpRight size={17} aria-hidden="true" /></Link>
          <a className={styles.externalMap} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.name.ko} ${selected.address.ko}`)}`} target="_blank" rel="noopener noreferrer">{t.addressMap}<ArrowUpRight size={15} aria-hidden="true" /></a>
        </article>}
      </div>
    </div>
  );
}
