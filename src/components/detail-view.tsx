"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bookmark,
  Check,
  Clock3,
  ExternalLink,
  MapPin,
  Share2,
  ShieldCheck,
} from "lucide-react";
import type { Fact, Locale, Place, PlaceFacts } from "@/lib/types";
import { filterAndSortPlaces } from "@/lib/catalog";
import { evaluatePlace, getFactFreshness } from "@/lib/verdict/evaluate";
import { MAX_SAVED_PLACES } from "@/lib/trip/state";
import { useTravelStore } from "@/hooks/use-travel-store";
import { copy, priceLabel } from "@/messages/ui";
import { catalogCopy, observationLabel } from "@/messages/catalog";
import {
  detailCopy,
  detailFactLabels,
  detailFactValue,
} from "@/messages/detail";
import { DemoNotice, PageIntro } from "./common";
import { PlaceCard } from "./place-card";
import { PlaceFeatures } from "./place-features";
import { PlaceImage, PhotoAttribution } from "./place-image";
import { isVisitJejuUrl } from "@/lib/external-link";

function safeExternalUrl(value: string | undefined): string | null {
  if (!value || isVisitJejuUrl(value)) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function displayDate(
  value: string | null | undefined,
  locale: Locale,
): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "Asia/Seoul",
      }).format(date)
    : null;
}

function factCycle(key: keyof PlaceFacts): number {
  if (key === "operating") return 60;
  return [
    "highChair",
    "stroller",
    "stepFree",
    "seating",
    "walkingMinutes",
    "parking",
    "toilet",
  ].includes(key)
    ? 365
    : 90;
}

export function DetailView({
  locale,
  place,
  places,
}: {
  locale: Locale;
  place: Place;
  places: Place[];
}) {
  const c = copy(locale);
  const t = detailCopy(locale);
  const catalog = catalogCopy(locale);
  const store = useTravelStore();
  const [actionMessage, setActionMessage] = useState("");
  const [manualShareUrl, setManualShareUrl] = useState("");
  const [reportText, setReportText] = useState("");
  const [reportState, setReportState] = useState<
    "idle" | "sending" | "sent" | "failed" | "unavailable"
  >("idle");
  const isDemo = place.dataMode === "demo";
  const isSaved = store.savedIds.includes(place.id);
  const evaluation = evaluatePlace(place, store.profile);
  const hasRequirements =
    store.profile.companions.length > 0 ||
    store.profile.stroller ||
    store.profile.stepFree ||
    store.profile.shortWalk;
  const sourceUrl = safeExternalUrl(place.sourceUrl);
  const verifiedDate = displayDate(place.verifiedAt, locale);
  const retrievedDate = displayDate(place.retrievedAt, locale);
  const sourceReadDate = displayDate(place.basicSourceCheckedAt, locale);
  const money = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);
  const alternatives = filterAndSortPlaces(
    places.filter((candidate) => candidate.id !== place.id),
    { ...store.profile, regions: [place.region] },
    { locale, includeUnknown: false },
  )
    .filter((match) => match.evaluation.verdict === "fit")
    .slice(0, 3);
  const directionUrl =
    !isDemo && Number.isFinite(place.lat) && Number.isFinite(place.lng)
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.lat},${place.lng}`)}`
      : null;
  const addressMapUrl = !isDemo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name.ko} ${place.address.ko}`)}`
    : null;

  function savePlace() {
    if (!isSaved && store.savedIds.length >= MAX_SAVED_PLACES) {
      setActionMessage(t.savedLimit);
      return;
    }
    store.toggleSaved(place.id);
    setActionMessage("");
  }

  async function sharePlace() {
    const url = window.location.href;
    setActionMessage("");
    setManualShareUrl("");
    if (navigator.share) {
      try {
        await navigator.share({
          title: place.name[locale],
          text: place.summary[locale],
          url,
        });
        setActionMessage(t.shared);
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setActionMessage(c.copied);
    } catch {
      setActionMessage(t.shareFailed);
      setManualShareUrl(url);
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDemo || reportState === "sending") return;
    const message = reportText.trim();
    if (message.length < 5 || message.length > 500) return;
    setReportState("sending");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: place.id,
          category: "facility",
          message,
          locale,
        }),
      });
      if (!response.ok) {
        setReportState(response.status === 503 ? "unavailable" : "failed");
        return;
      }
      setReportText("");
      setReportState("sent");
    } catch {
      setReportState("failed");
    }
  }

  return (
    <main className="page detail-page">
      <PageIntro
        locale={locale}
        title={place.name[locale]}
        description={place.summary[locale]}
        back="results"
      />
      {isDemo && <DemoNotice locale={locale} />}
      <PlaceFeatures place={place} locale={locale} />
      <div className="detail-layout">
        <div className="detail-content">
          {place.imageKind !== "placeholder" && (
            <div className="detail-hero">
              <PlaceImage place={place} locale={locale} variant="detail" />
              {isDemo && <span className="image-label">{c.illustration}</span>}
            </div>
          )}
          <PhotoAttribution place={place} locale={locale} />
          <section className="panel" aria-labelledby="place-overview">
            <div className="place-meta">
              <span>
                <MapPin size={16} aria-hidden="true" />
                {place.district[locale]}
              </span>
              <span>{c[place.type]}</span>
            </div>
            <h2 id="place-overview">{c.aboutPlace}</h2>
            <p>{place.summary[locale]}</p>
            <p className="muted">{place.address[locale]}</p>
            {!!place.sourceTags?.length && (
              <div className="source-tags" aria-label={catalog.sourceTags}>
                {place.sourceTags
                  .filter(
                    (tag) =>
                      ![place.name.ko, "visitjeju", "비짓제주"].includes(tag),
                  )
                  .map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
              </div>
            )}
            <div className="detail-summary-grid">
              <div>
                <span className="eyebrow">{t.basePrice}</span>
                <p>
                  <strong>{priceLabel(place, locale)}</strong>
                </p>
              </div>
              <div>
                <span className="eyebrow">{c.extraPet}</span>
                <p>
                  {place.price.petExtra === null
                    ? c.priceUnknown
                    : place.price.petExtra === 0
                      ? t.noPetExtra
                      : money(place.price.petExtra)}
                </p>
              </div>
              <div>
                <span className="eyebrow">{c.duration}</span>
                <p>
                  <Clock3 size={16} aria-hidden="true" />{" "}
                  {place.durationMinutes === null
                    ? t.unknown
                    : `${place.durationMinutes} ${c.minutes}`}
                </p>
              </div>
            </div>
            <p className="muted">{t.priceNote}</p>
            <p className="muted">{t.timeNote}</p>
          </section>

          {!!place.sourceObservations?.length && (
            <section className="panel" aria-labelledby="official-observations">
              <h2 id="official-observations">{catalog.observations}</h2>
              <p className="muted">{catalog.observationNote}</p>
              <dl className="fact-list">
                {place.sourceObservations.map((observation, index) => (
                  <div
                    className="fact-row"
                    key={`${observation.field}-${index}`}
                  >
                    <dt>{observationLabel(observation.field, locale)}</dt>
                    <dd>
                      <p>{observation.value}</p>
                      <small className="muted">
                        {displayDate(observation.verifiedAt, locale)
                          ? `${c.verified} ${displayDate(observation.verifiedAt, locale)}`
                          : t.noVerification}
                      </small>
                      {safeExternalUrl(observation.sourceUrl) && (
                        <a
                          href={safeExternalUrl(observation.sourceUrl)!}
                          className="text-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {c.sourceLink} · {new URL(observation.sourceUrl).hostname}
                          <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {sourceReadDate && (
                <p className="muted">
                  {catalog.sourceRead} {sourceReadDate}
                  {place.sourceName === "VisitJeju" ? " · 비짓제주" : ""}
                </p>
              )}
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  className="text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {place.sourceName ?? c.sourceLink} <ExternalLink size={15} />
                </a>
              )}
            </section>
          )}

          <section className="panel" aria-labelledby="match-heading">
            <p className="eyebrow">{t.placeDetail}</p>
            <h2 id="match-heading">{c.detailsTitle}</h2>
            {isDemo && <p className="muted">{t.demoMatch}</p>}
            {hasRequirements ? (
              <>
                <div className={`status-badge ${evaluation.verdict}`}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  {c[evaluation.verdict]}
                </div>
                <ul className="detail-reasons">
                  {evaluation.reasons.map((reason, index) => (
                    <li key={`${reason.code}-${index}`}>
                      <span className={`status-badge ${reason.verdict}`}>
                        {reason.verdict === "fit" ? (
                          <Check size={15} aria-hidden="true" />
                        ) : (
                          <AlertCircle size={15} aria-hidden="true" />
                        )}
                      </span>
                      <span>{reason.message[locale]}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>{t.chooseProfile}</p>
            )}
            <Link className="text-link" href={`/${locale}/plan`}>
              {t.changeProfile} <ExternalLink size={14} aria-hidden="true" />
            </Link>
          </section>

          <section className="panel" aria-labelledby="facts-heading">
            <h2 id="facts-heading">{c.factLabel}</h2>
            <p className="muted">{t.factsDescription}</p>
            <dl className="fact-list">
              {(
                Object.entries(place.facts) as [
                  keyof PlaceFacts,
                  Fact<unknown>,
                ][]
              ).map(([key, fact]) => {
                const date = displayDate(fact.verifiedAt, locale);
                const freshness = getFactFreshness(
                  fact,
                  new Date(),
                  factCycle(key),
                );
                const factSource =
                  fact.source === "demo"
                    ? t.demoFact
                    : fact.source === "official"
                      ? t.official
                      : fact.source === "phone"
                        ? t.phone
                        : fact.source === "onsite"
                          ? t.onsite
                          : t.unknown;
                const factSourceUrl = safeExternalUrl(fact.sourceUrl);
                return (
                  <div className="fact-row" key={key}>
                    <dt>{detailFactLabels[key][locale]}</dt>
                    <dd>
                      <strong>
                        {detailFactValue(key, fact.value, locale)}
                      </strong>
                      {fact.note?.[locale] && <p>{fact.note[locale]}</p>}
                      <small className="muted">
                        {factSource} ·{" "}
                        {date ? `${c.verified} ${date}` : t.noVerification}
                      </small>
                      {freshness === "stale" && (
                        <small className="status-badge conditional">
                          {t.stale}
                        </small>
                      )}
                      {freshness === "dueSoon" && (
                        <small className="muted">{t.dueSoon}</small>
                      )}
                      {factSourceUrl && (
                        <a
                          href={factSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link"
                        >
                          {c.sourceLink}
                          <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          <section className="panel" aria-labelledby="source-heading">
            <h2 id="source-heading">{c.source}</h2>
            {isDemo ? (
              <p>{c.demoSource}</p>
            ) : (
              <p>
                {verifiedDate ? `${c.verified} ${verifiedDate}` : c.unverified}
              </p>
            )}
            {(sourceReadDate || retrievedDate) && (
              <p className="muted">
                {catalog.sourceRead} {sourceReadDate ?? retrievedDate}
              </p>
            )}
            {sourceUrl && (
              <a
                href={sourceUrl}
                className="text-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.sourceLink}
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            )}
            <details className="detail-report">
              <summary>{c.report}</summary>
              {isDemo ? (
                <p className="muted">{t.reportDemo}</p>
              ) : (
                <form onSubmit={submitReport}>
                  <p className="muted">{t.reportHelp}</p>
                  <label htmlFor={`report-${place.id}`}>{t.reportLabel}</label>
                  <textarea
                    id={`report-${place.id}`}
                    value={reportText}
                    onChange={(event) => setReportText(event.target.value)}
                    minLength={5}
                    maxLength={500}
                    required
                    rows={4}
                    placeholder={c.reportPlaceholder}
                    disabled={reportState === "sending"}
                  />
                  <button
                    className="btn secondary"
                    type="submit"
                    disabled={
                      reportState === "sending" || reportText.trim().length < 5
                    }
                  >
                    {reportState === "sending" ? t.reportSending : c.send}
                  </button>
                  <p role="status">
                    {reportState === "sent"
                      ? c.reportSent
                      : reportState === "failed"
                        ? c.reportError
                        : reportState === "unavailable"
                          ? t.reportUnavailable
                          : ""}
                  </p>
                </form>
              )}
            </details>
          </section>
        </div>

        <aside className="detail-sidebar">
          <div className="panel">
            <span className="eyebrow">
              {c[place.type]} · {c[place.region]}
            </span>
            <h2>{place.name[locale]}</h2>
            <p className="detail-price">
              <strong>{priceLabel(place, locale)}</strong>
            </p>
            <button
              className={`btn primary ${isSaved ? "is-saved" : ""}`}
              aria-pressed={isSaved}
              aria-label={isSaved ? c.removeSaved : c.save}
              disabled={!store.hydrated}
              onClick={savePlace}
            >
              <Bookmark
                size={19}
                fill={isSaved ? "currentColor" : "none"}
                aria-hidden="true"
              />
              {isSaved ? c.saved : c.save}
            </button>
            <button className="btn secondary" onClick={sharePlace}>
              <Share2 size={18} aria-hidden="true" />
              {c.share}
            </button>
            {directionUrl ? (
              <a
                href={directionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
              >
                <MapPin size={18} aria-hidden="true" />
                {c.directions}
              </a>
            ) : addressMapUrl ? (
              <a
                href={addressMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
              >
                <MapPin size={18} aria-hidden="true" />
                {catalog.addressMap}
              </a>
            ) : (
              <button className="btn secondary" disabled>
                <MapPin size={18} aria-hidden="true" />
                {c.directions}
              </button>
            )}
            {isDemo && <p className="muted">{c.demoDirections}</p>}
            <p className="muted">{c.localSaved}</p>
            <p role="status" aria-live="polite">
              {actionMessage}
            </p>
            {manualShareUrl && (
              <label className="share-fallback">
                {t.shareLink}
                <input
                  readOnly
                  value={manualShareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
            )}
            {store.storageError && (
              <p className="notice" role="status">
                {t.storageFailed}
              </p>
            )}
          </div>
        </aside>
      </div>
      {alternatives.length > 0 && (
        <section className="section" aria-labelledby="alternatives-heading">
          <div className="section-head">
            <div>
              <h2 id="alternatives-heading">{t.alternatives}</h2>
              <p className="muted">{t.alternativesDescription}</p>
            </div>
          </div>
          <div className="place-grid">
            {alternatives.map(({ place: alternative }) => (
              <PlaceCard
                key={alternative.id}
                place={alternative}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
