"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import type { Locale, Place } from "@/lib/types";
import { copy } from "@/messages/ui";
import { designCopy } from "@/messages/design";
import { photoCopy } from "@/messages/photos";
import { typeIcons } from "./common";

export function PlaceImage({
  place,
  locale,
  variant = "card",
  className,
  thumbnailWidth = 72,
  thumbnailHeight = 72,
}: {
  place: Place;
  locale: Locale;
  variant?: "card" | "detail" | "thumbnail";
  className?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = failedSource === place.image;
  const hasImage = Boolean(place.image) && place.imageKind !== "placeholder" && !failed;
  const c = copy(locale);
  const t = photoCopy(locale);
  const TypeIcon = typeIcons[place.type];
  const thumbnail = variant === "thumbnail";
  const label = hasImage
    ? place.dataMode === "demo" ? c.demoPlace : c[place.type]
    : failed ? t.unavailable : designCopy(locale).noPhoto;

  return (
    <>
      {hasImage ? (
        <Image
          key={place.image}
          src={place.image}
          alt={thumbnail ? "" : place.photoSource?.alt ?? place.name[locale]}
          {...(thumbnail ? { width: thumbnailWidth, height: thumbnailHeight } : { fill: true })}
          sizes={thumbnail ? `${thumbnailWidth}px` : variant === "detail" ? "(max-width:900px) 92vw,760px" : "(max-width:640px) 92vw,(max-width:1000px) 45vw,380px"}
          loading={variant === "detail" ? "eager" : "lazy"}
          className={className}
          unoptimized
          onError={() => setFailedSource(place.image)}
        />
      ) : (
        <span
          className={`${thumbnail ? "place-thumbnail-fallback" : "place-type-art"} place-image-fallback ${className ?? ""}`}
          data-type={place.type}
          role="img"
          aria-label={`${place.name[locale]} · ${label}`}
        >
          {!thumbnail && <span className="place-art-word">{place.type.toUpperCase()}</span>}
          <TypeIcon size={thumbnail ? 28 : 50} strokeWidth={1} aria-hidden="true" />
          {!thumbnail && <span className="place-art-region">JEJU · {c[place.region]}</span>}
        </span>
      )}
      {!thumbnail && (variant === "card" || !hasImage) && <span className="image-label">{label}</span>}
    </>
  );
}

export function PhotoAttribution({ place, locale }: { place: Place; locale: Locale }) {
  if (!place.photoSource) return null;
  const t = photoCopy(locale);
  return (
    <p className="place-photo-credit">
      <a href={place.photoSource.sourceUrl} target="_blank" rel="noopener noreferrer">
        {t.source} · {place.photoSource.sourceName}
        <ExternalLink size={11} aria-hidden="true" />
      </a>
      <span>{t.observed} <time dateTime={place.photoSource.observedAt}>{place.photoSource.observedAt}</time></span>
    </p>
  );
}
