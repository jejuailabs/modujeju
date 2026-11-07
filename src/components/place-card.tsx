"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  MapPin,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import type { Locale, Place } from "@/lib/types";
import { copy, priceLabel } from "@/messages/ui";
import { detailCopy } from "@/messages/detail";
import { catalogCopy } from "@/messages/catalog";
import { useTravelStore } from "@/hooks/use-travel-store";
import { MAX_SAVED_PLACES } from "@/lib/trip/state";
import { evaluatePlace } from "@/lib/verdict/evaluate";

export function PlaceCard({ place, locale }: { place: Place; locale: Locale }) {
  const { profile, savedIds, toggleSaved, hydrated } = useTravelStore();
  const [saveLimitReached, setSaveLimitReached] = useState(false);
  const c = copy(locale);
  const t = catalogCopy(locale);
  const ev = evaluatePlace(place, profile);
  const saved = savedIds.includes(place.id);

  function savePlace() {
    if (!saved && savedIds.length >= MAX_SAVED_PLACES) {
      setSaveLimitReached(true);
      return;
    }
    setSaveLimitReached(false);
    toggleSaved(place.id);
  }

  return (
    <article className="place-card">
      <div className="place-image">
        <Link
          href={`/${locale}/places/${place.slug}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            src={place.image}
            alt=""
            fill
            sizes="(max-width:640px) 92vw,(max-width:1000px) 45vw,380px"
          />
        </Link>
        <span className="image-label">
          {place.imageKind === "placeholder" ? t.placeholder : place.dataMode === "demo" ? c.demoPlace : c[place.type]}
        </span>
        <button
          type="button"
          className={`bookmark-button ${saved ? "is-saved" : ""}`}
          aria-pressed={saved}
          aria-label={`${place.name[locale]}: ${saved ? c.removeSaved : c.save}`}
          disabled={!hydrated}
          onClick={savePlace}
        >
          <Bookmark
            size={21}
            fill={saved ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
      </div>
      <div className="place-card-body">
        <div className="place-meta">
          <span>
            <MapPin size={13} aria-hidden="true" />
            {place.district[locale]}
          </span>
          <span>{c[place.type]}</span>
        </div>
        <Link className="place-name" href={`/${locale}/places/${place.slug}`}>
          <h3>{place.name[locale]}</h3>
          <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
        <p className="place-summary">{place.summary[locale]}</p>
        {!!place.sourceTags?.length && <div className="source-tags" aria-label={t.sourceTags}>
          {place.sourceTags.slice(0, 4).map((tag) => <span key={tag}>#{tag}</span>)}
        </div>}
        <div className={`status-badge ${ev.verdict}`}>
          <CheckCircle2 size={14} aria-hidden="true" />
          {c[ev.verdict]}
        </div>
        <div className="place-facts">
          {ev.reasons.slice(0, 2).map((reason, index) => (
            <span key={reason.code + index}>{reason.message[locale]}</span>
          ))}
        </div>
        <div className="place-bottom">
          <strong>{priceLabel(place, locale)}</strong>
          <span>
            <Clock3 size={12} aria-hidden="true" />
            {place.dataMode === "demo"
              ? c.demoPlace
              : place.verifiedAt
                ? `${place.verifiedAt} ${c.verified}`
                : c.unverified}
          </span>
        </div>
        {saveLimitReached && (
          <p className="notice" role="status">
            {detailCopy(locale).savedLimit}
          </p>
        )}
      </div>
    </article>
  );
}
