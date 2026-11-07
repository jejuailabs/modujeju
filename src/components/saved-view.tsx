"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, CalendarDays, Check, Grid2X2, HardDrive, Map as MapIcon, MapPin, Search } from "lucide-react";
import type { Locale, Place } from "@/lib/types";
import { browsePlaceTypes, browseCategory, type BrowsePlaceType } from "@/lib/place-categories";
import { useTravelStore } from "@/hooks/use-travel-store";
import { MAX_TRIP_DAYS } from "@/lib/trip/state";
import { copy } from "@/messages/ui";
import { tripMessages } from "@/messages/trip";
import { savedMessages } from "@/messages/saved";
import { DemoNotice, typeIcons } from "./common";
import { PlaceCard } from "./place-card";
import { SavedPlaceMap } from "./saved-place-map";
import styles from "./saved-view.module.css";

export function SavedView({ locale, places }: { locale: Locale; places: Place[] }) {
  const c = copy(locale);
  const trip = tripMessages[locale];
  const t = savedMessages[locale];
  const store = useTravelStore();
  const [category, setCategory] = useState<BrowsePlaceType | "all">("all");
  const [view, setView] = useState<"map" | "list">("map");
  const [query, setQuery] = useState("");
  const placesById = new Map(places.map((place) => [place.id, place]));
  const savedPlaces = store.savedIds.flatMap((id) => {
    const place = placesById.get(id);
    return place ? [place] : [];
  });
  const unavailableCount = store.savedIds.length - savedPlaces.length;
  const queryText = query.trim().toLocaleLowerCase(locale);
  const visiblePlaces = savedPlaces.filter((place) =>
    (category === "all" || browseCategory(place.type) === category) &&
    (!queryText || `${place.name[locale]} ${place.name.ko} ${place.address[locale]} ${place.district[locale]} ${c[place.region]}`.toLocaleLowerCase(locale).includes(queryText)),
  );
  const regionCount = new Set(savedPlaces.map((place) => place.region)).size;
  const duration = (days: number) => days === 1 ? t.dayTrip : `${days - 1}${locale === "en" ? " " : ""}${t.nightsUnit} ${days}${locale === "en" ? " " : ""}${t.daysUnit}`;

  return (
    <main className={`page saved-page ${styles.page}`}>
      <header className={styles.header}>
        <div><span className="eyebrow">MY JEJU COLLECTION</span><h1>{t.title}</h1><p>{t.description}</p></div>
        <Link href={`/${locale}/results`} className="btn secondary">{t.addPlaces}<ArrowRight size={17} aria-hidden="true" /></Link>
      </header>
      <ol className={styles.journey} aria-label={t.description}>
        {[t.savedStep, t.mapStep, t.planStep].map((step, index) => <li key={step}><span>{index === 0 && savedPlaces.length > 0 ? <Check size={14} aria-hidden="true" /> : index + 1}</span>{step}</li>)}
      </ol>
      {places.some((place) => place.dataMode === "demo") && <DemoNotice locale={locale} />}
      <p className={styles.storageNote} role={store.storageError ? "status" : undefined}><HardDrive size={15} aria-hidden="true" />{store.storageError ? trip.storageUnavailable : trip.localOnly}</p>
      {store.recovered && <p className="notice" role="status">{trip.recovered}</p>}
      {store.hydrated && unavailableCount > 0 && <p className="notice" role="status">{trip.unavailablePlaces.replace("{count}", new Intl.NumberFormat(locale).format(unavailableCount))}</p>}

      {!store.hydrated ? <p className="muted" role="status">{c.loading}</p> : savedPlaces.length > 0 ? (
        <>
          <section className={styles.collectionSummary} aria-label={t.savedPlaces}>
            <div><Bookmark size={23} aria-hidden="true" /><span>{t.savedPlaces}<strong>{savedPlaces.length}<small>{c.countSuffix}</small></strong></span></div>
            <div><MapPin size={23} aria-hidden="true" /><span>{t.regions}<strong>{regionCount}</strong></span></div>
            <div><CalendarDays size={23} aria-hidden="true" /><span>{t.nights}<strong className={styles.duration}>{duration(store.tripDays)}</strong></span></div>
          </section>
          <section className={styles.collection} aria-labelledby="saved-collection-title">
            <div className={styles.sectionHeading}>
              <div><span className="eyebrow">PLACES TO KEEP CLOSE</span><h2 id="saved-collection-title">{t.mapTitle}</h2><p>{t.mapDescription}</p></div>
              <div className={styles.viewToggle} aria-label={t.savedPlaces}>
                <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><MapIcon size={17} aria-hidden="true" />{t.mapView}</button>
                <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}><Grid2X2 size={17} aria-hidden="true" />{t.listView}</button>
              </div>
            </div>
            <div className={styles.filterRow}>
              <div className={styles.categories} aria-label={c.what}>
                <button type="button" className={styles.categoryButton} aria-pressed={category === "all"} onClick={() => setCategory("all")}>{t.all}<span>{savedPlaces.length}</span></button>
                {browsePlaceTypes.map((type) => {
                  const Icon = typeIcons[type];
                  const count = savedPlaces.filter((place) => browseCategory(place.type) === type).length;
                  return <button key={type} type="button" className={`${styles.categoryButton} ${styles[type]}`} aria-pressed={category === type} onClick={() => setCategory(type)}><Icon size={18} aria-hidden="true" />{c[type]}<span>{count}</span></button>;
                })}
              </div>
              <label className={styles.search}><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} /></label>
            </div>
            <p className={styles.resultCount} role="status">{visiblePlaces.length} {c.countSuffix}</p>
            {visiblePlaces.length > 0 ? view === "map" ? <SavedPlaceMap locale={locale} places={visiblePlaces} /> : <div className="place-grid">{visiblePlaces.map((place) => <PlaceCard key={place.id} locale={locale} place={place} />)}</div> : (
              <div className={`empty-state ${styles.filterEmpty}`}><Search size={30} aria-hidden="true" /><h3>{t.noFilter}</h3><button type="button" className="btn secondary" onClick={() => { setCategory("all"); setQuery(""); }}>{t.resetFilter}</button></div>
            )}
          </section>
          <section className={styles.planPanel} aria-labelledby="saved-plan-title">
            <div className={styles.planCopy}><span className={styles.planSymbol}><CalendarDays size={30} aria-hidden="true" /></span><div><h2 id="saved-plan-title">{t.planTitle}</h2><p>{t.planDescription}</p></div></div>
            <div className={styles.planControls}>
              <label>{t.nights}<select value={store.tripDays} onChange={(event) => store.setTripDays(Number(event.target.value))}>{Array.from({ length: MAX_TRIP_DAYS }, (_, index) => index + 1).map((days) => <option key={days} value={days}>{duration(days)}</option>)}</select></label>
              <Link href={`/${locale}/itinerary`} className="btn primary">{t.planButton}<ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </section>
        </>
      ) : (
        <section className={`empty-state ${styles.empty}`}><Bookmark size={46} strokeWidth={1.4} aria-hidden="true" /><h2>{unavailableCount > 0 ? trip.noAvailableSaved : c.emptySaved}</h2><p>{c.emptySavedCopy}</p><Link href={`/${locale}/results`} className="btn primary">{c.navExplore}<ArrowRight size={18} aria-hidden="true" /></Link></section>
      )}
    </main>
  );
}
