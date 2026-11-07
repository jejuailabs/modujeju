"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, CalendarDays, HardDrive } from "lucide-react";
import type { Locale, Place } from "@/lib/types";
import { useTravelStore } from "@/hooks/use-travel-store";
import { copy } from "@/messages/ui";
import { tripMessages } from "@/messages/trip";
import { DemoNotice, PageIntro } from "./common";
import { PlaceCard } from "./place-card";

export function SavedView({
  locale,
  places,
}: {
  locale: Locale;
  places: Place[];
}) {
  const c = copy(locale);
  const trip = tripMessages[locale];
  const { savedIds, hydrated, storageError, recovered } = useTravelStore();
  const placesById = new Map(places.map((place) => [place.id, place]));
  const savedPlaces = savedIds.flatMap((id) => {
    const place = placesById.get(id);
    return place ? [place] : [];
  });
  const unavailableCount = savedIds.length - savedPlaces.length;

  return (
    <main className="page saved-page">
      <PageIntro
        locale={locale}
        title={c.savedTitle}
        description={c.savedCopy}
      />
      {places.some((place) => place.dataMode === "demo") && (
        <DemoNotice locale={locale} />
      )}
      <div className="notice local-notice">
        <HardDrive size={18} aria-hidden="true" />
        <span>{storageError ? trip.storageUnavailable : trip.localOnly}</span>
      </div>
      {recovered && (
        <p className="notice" role="status">
          {trip.recovered}
        </p>
      )}
      {hydrated && unavailableCount > 0 && (
        <p className="notice" role="status">
          {trip.unavailablePlaces.replace(
            "{count}",
            new Intl.NumberFormat(locale).format(unavailableCount),
          )}
        </p>
      )}
      {!hydrated ? (
        <p className="muted" role="status">
          {c.loading}
        </p>
      ) : savedPlaces.length ? (
        <>
          <div className="saved-toolbar">
            <p className="muted">
              {savedPlaces.length} {c.countSuffix}
            </p>
            <Link href={`/${locale}/itinerary`} className="btn primary">
              <CalendarDays size={18} aria-hidden="true" />
              {c.makeTrip}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="place-grid">
            {savedPlaces.map((place) => (
              <PlaceCard key={place.id} locale={locale} place={place} />
            ))}
          </div>
        </>
      ) : (
        <section className="empty-state">
          <Bookmark size={42} strokeWidth={1.3} aria-hidden="true" />
          <h2>{unavailableCount > 0 ? trip.noAvailableSaved : c.emptySaved}</h2>
          <p>{c.emptySavedCopy}</p>
          <Link href={`/${locale}/results`} className="btn primary">
            {c.navExplore}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      )}
    </main>
  );
}
