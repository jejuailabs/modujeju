"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Download,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import type { Locale, Place } from "@/lib/types";
import { itineraryJsonExport } from "@/lib/trip/export";
import { tripDayDate } from "@/lib/trip/state";
import { useTravelStore } from "@/hooks/use-travel-store";
import { copy, priceLabel } from "@/messages/ui";
import { tripMessages } from "@/messages/trip";
import { DemoNotice, PageIntro } from "./common";

const dateLocales: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
};

export function TripBoard({
  locale,
  places,
}: {
  locale: Locale;
  places: Place[];
}) {
  const c = copy(locale);
  const tripCopy = tripMessages[locale];
  const store = useTravelStore();
  const [targetDays, setTargetDays] = useState<Record<string, number>>({});
  const [exportError, setExportError] = useState(false);
  const byId = new Map(places.map((place) => [place.id, place]));
  const savedPlaces = store.savedIds.flatMap((id) => {
    const place = byId.get(id);
    return place ? [place] : [];
  });
  const unavailableCount = store.savedIds.length - savedPlaces.length;
  const days = Array.from({ length: store.tripDays }, (_, index) => index + 1);
  const dayTitle = (day: number) =>
    locale === "en" ? `${c.day} ${day}` : `${day}${c.day}`;
  const assignedCount = Object.values(store.itinerary).flat().length;

  function downloadItinerary() {
    setExportError(false);
    let objectUrl: string | null = null;
    try {
      const json = itineraryJsonExport(store, places, locale);
      objectUrl = URL.createObjectURL(
        new Blob([json], { type: "application/json;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `modujeju-itinerary${store.tripStartDate ? `-${store.tripStartDate}` : ""}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      const downloadedUrl = objectUrl;
      // Allow the browser to start the download before releasing its temporary URL.
      window.setTimeout(() => URL.revokeObjectURL(downloadedUrl), 1000);
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setExportError(true);
    }
  }

  return (
    <main className="page trip-page">
      <PageIntro locale={locale} title={c.tripTitle} description={c.tripCopy} />
      {places.some((place) => place.dataMode === "demo") && (
        <DemoNotice locale={locale} />
      )}
      <div className="notice">
        <CalendarDays size={18} aria-hidden="true" />
        <span>{c.tripNote}</span>
      </div>
      <p className="muted local-notice">
        {store.storageError ? tripCopy.storageUnavailable : tripCopy.localOnly}
      </p>
      {store.recovered && (
        <p className="notice" role="status">
          {tripCopy.recovered}
        </p>
      )}
      {store.hydrated && unavailableCount > 0 && (
        <p className="notice" role="status">
          {tripCopy.unavailablePlaces.replace(
            "{count}",
            new Intl.NumberFormat(locale).format(unavailableCount),
          )}
        </p>
      )}

      <section className="panel trip-controls" aria-label={c.tripTitle}>
        <label htmlFor="trip-start-date">
          <span>{c.startDate}</span>
          <input
            id="trip-start-date"
            type="date"
            value={store.tripStartDate}
            onInput={(event) =>
              store.setTripStartDate(event.currentTarget.value)
            }
            onChange={(event) => store.setTripStartDate(event.target.value)}
            disabled={!store.hydrated}
          />
        </label>
        <label htmlFor="trip-day-count">
          <span>{c.tripDays}</span>
          <select
            id="trip-day-count"
            value={store.tripDays}
            onChange={(event) => store.setTripDays(Number(event.target.value))}
            disabled={!store.hydrated}
          >
            {[1, 2, 3, 4, 5].map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn secondary"
          type="button"
          onClick={downloadItinerary}
          disabled={!store.hydrated || assignedCount === 0}
          title={tripCopy.exportHint}
        >
          <Download size={18} aria-hidden="true" />
          {c.exportTrip}
        </button>
        <p className="muted trip-controls-hint">{tripCopy.daysReduced}</p>
      </section>
      {exportError && (
        <div role="alert" className="notice">
          <span>{c.exportTrip}</span>
          <button
            className="btn secondary"
            type="button"
            onClick={downloadItinerary}
          >
            {c.retry}
          </button>
        </div>
      )}

      {!store.hydrated ? (
        <p className="muted" role="status">
          {c.loading}
        </p>
      ) : (
        <div className="trip-layout">
          <div className="day-grid">
            {days.map((day) => {
              const dayIds = store.itinerary[String(day)] ?? [];
              const dayPlaces = dayIds.flatMap((id) => {
                const place = byId.get(id);
                return place ? [place] : [];
              });
              const unavailableDayCount = dayIds.length - dayPlaces.length;
              const date = tripDayDate(store.tripStartDate, day);
              return (
                <section
                  key={day}
                  className="day-column panel"
                  aria-labelledby={`day-title-${day}`}
                >
                  <header className="day-header">
                    <div>
                      <h2 id={`day-title-${day}`}>{dayTitle(day)}</h2>
                      <span className="muted">
                        {date
                          ? new Intl.DateTimeFormat(dateLocales[locale], {
                              month: "short",
                              day: "numeric",
                              weekday: "short",
                              timeZone: "UTC",
                            }).format(new Date(`${date}T12:00:00Z`))
                          : tripCopy.noDate}
                      </span>
                    </div>
                    <span className="day-count">
                      {dayPlaces.length} {c.countSuffix}
                    </span>
                  </header>
                  {unavailableDayCount > 0 && (
                    <p className="notice" role="status">
                      {tripCopy.unavailableDay.replace(
                        "{count}",
                        new Intl.NumberFormat(locale).format(
                          unavailableDayCount,
                        ),
                      )}
                    </p>
                  )}
                  {dayPlaces.length ? (
                    <ol className="day-stops">
                      {dayPlaces.map((place, index) => (
                        <li className="trip-stop" key={place.id}>
                          <div className="stop-order" aria-hidden="true">
                            {index + 1}
                          </div>
                          <Link
                            href={`/${locale}/places/${place.slug}`}
                            className="stop-image"
                            style={{ position: "relative", overflow: "hidden" }}
                            tabIndex={-1}
                            aria-hidden="true"
                          >
                            <Image
                              src={place.image}
                              fill
                              sizes="72px"
                              style={{ objectFit: "cover" }}
                              alt=""
                            />
                          </Link>
                          <div className="stop-copy">
                            <Link href={`/${locale}/places/${place.slug}`}>
                              {place.name[locale]}
                            </Link>
                            <span className="muted">
                              <MapPin size={12} aria-hidden="true" />
                              {place.district[locale]} · {c[place.type]}
                            </span>
                            <span className="muted">
                              {priceLabel(place, locale)}
                            </span>
                          </div>
                          <div className="stop-actions">
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => store.moveInDay(day, place.id, -1)}
                              disabled={index === 0}
                              aria-label={`${place.name[locale]}: ${tripCopy.moveUp}`}
                              title={tripCopy.moveUp}
                            >
                              <ArrowUp size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => store.moveInDay(day, place.id, 1)}
                              disabled={index === dayPlaces.length - 1}
                              aria-label={`${place.name[locale]}: ${tripCopy.moveDown}`}
                              title={tripCopy.moveDown}
                            >
                              <ArrowDown size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => store.removeFromDay(day, place.id)}
                              aria-label={`${place.name[locale]}: ${tripCopy.remove}`}
                              title={tripCopy.remove}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="empty-day">
                      <Plus size={24} aria-hidden="true" />
                      <p>{c.emptyDay}</p>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <aside className="panel trip-pool" aria-labelledby="trip-pool-title">
            <h2 id="trip-pool-title">{c.tripPool}</h2>
            {savedPlaces.length ? (
              <div className="pool-list">
                {savedPlaces.map((place) => {
                  const selectedDay = Math.min(
                    targetDays[place.id] ?? 1,
                    store.tripDays,
                  );
                  const assignedDay = days.find((day) =>
                    store.itinerary[String(day)]?.includes(place.id),
                  );
                  return (
                    <article className="pool-item" key={place.id}>
                      <Image
                        src={place.image}
                        width={68}
                        height={62}
                        style={{ height: "auto" }}
                        alt=""
                      />
                      <div className="pool-copy">
                        <Link href={`/${locale}/places/${place.slug}`}>
                          <strong>{place.name[locale]}</strong>
                        </Link>
                        <span className="muted">
                          {c[place.region]} · {c[place.type]}
                        </span>
                        {assignedDay && (
                          <span className="pool-assigned">
                            {dayTitle(assignedDay)} · {c.saved}
                          </span>
                        )}
                      </div>
                      <div className="pool-controls">
                        <select
                          value={selectedDay}
                          aria-label={`${place.name[locale]}: ${c.day}`}
                          onChange={(event) =>
                            setTargetDays((current) => ({
                              ...current,
                              [place.id]: Number(event.target.value),
                            }))
                          }
                        >
                          {days.map((day) => (
                            <option key={day} value={day}>
                              {dayTitle(day)}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() =>
                            store.assignPlace(selectedDay, place.id)
                          }
                          disabled={assignedDay === selectedDay}
                          aria-label={`${place.name[locale]}: ${dayTitle(selectedDay)} ${c.addToDay}`}
                        >
                          <Plus size={16} aria-hidden="true" />
                          {c.addToDay}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state compact">
                <p>{c.emptySavedCopy}</p>
                <Link href={`/${locale}/results`} className="btn primary">
                  {c.navExplore}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
