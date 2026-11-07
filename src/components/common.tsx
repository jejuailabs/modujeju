"use client";
import type { Locale, Companion, Region, PlaceType } from "@/lib/types";
import { companions, regions, placeTypes } from "@/lib/types";
import { copy, regionImages } from "@/messages/ui";
import { designCopy } from "@/messages/design";
import { useTravelStore } from "@/hooks/use-travel-store";
import Image from "next/image";
import {
  Check,
  Utensils,
  Coffee,
  BedDouble,
  Camera,
  Flower2,
  Footprints,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { FeatureIcon } from "./feature-icon";
export const typeIcons = {
  restaurant: Utensils,
  cafe: Coffee,
  stay: BedDouble,
  attraction: Camera,
  experience: Flower2,
  walk: Footprints,
};
export function toggle<T>(items: T[], value: T): T[] {
  return items.includes(value)
    ? items.filter((x) => x !== value)
    : [...items, value];
}
export function DemoNotice({ locale }: { locale: Locale }) {
  const c = copy(locale);
  return (
    <div className="demo-notice">
      <span className="demo-dot" />
      <strong>{c.demo}</strong>
      <span>{c.demoInfo}</span>
    </div>
  );
}
export function CompanionPicker({ locale }: { locale: Locale }) {
  const { profile, setProfile } = useTravelStore();
  const c = copy(locale);
  const d = designCopy(locale);
  const notes = { kids: d.kidsNote, pet: d.petNote, senior: d.seniorNote };
  return (
    <div className="companion-grid">
      {companions.map((id: Companion) => {
        return (
          <button
            type="button"
            key={id}
            className={`companion-card companion-${id} ${profile.companions.includes(id) ? "selected" : ""}`}
            aria-pressed={profile.companions.includes(id)}
            onClick={() =>
              setProfile({ companions: toggle(profile.companions, id) })
            }
          >
            <span className="companion-symbol">
              <FeatureIcon feature={id} size={88} />
            </span>
            <span>{c[id]}</span>
            <small className="companion-note">{notes[id]}</small>
            <span className="selection-check">
              <Check size={13} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
export function RegionPicker({
  locale,
  onChoose,
}: {
  locale: Locale;
  onChoose?: (r: Region) => void;
}) {
  const { profile, setProfile } = useTravelStore(),
    c = copy(locale);
  return (
    <div className="region-grid">
      {regions.map((id) => (
        <button
          key={id}
          className={`region-card ${profile.regions.includes(id) ? "selected" : ""}`}
          aria-pressed={profile.regions.includes(id)}
          onClick={() =>
            onChoose
              ? onChoose(id)
              : setProfile({ regions: toggle(profile.regions, id) })
          }
        >
          <Image
            src={`/assets/images/${regionImages[id]}.webp`}
            fill
            sizes="(max-width:640px) 45vw, 280px"
            alt=""
          />
          <span className="region-shade" />
          <span className="region-label">
            <strong>{c[id]}</strong>
            <small>{c[id + "Sub"]}</small>
          </span>
          {profile.regions.includes(id) ? (
            <span className="region-check">
              <Check size={18} />
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
export function TypePicker({
  locale,
  onChoose,
}: {
  locale: Locale;
  onChoose?: (t: PlaceType) => void;
}) {
  const { profile, setProfile } = useTravelStore(),
    c = copy(locale);
  return (
    <div className="type-picker">
      {placeTypes.map((id) => {
        const Icon = typeIcons[id];
        return (
          <button
            key={id}
            aria-pressed={profile.types.includes(id)}
            className={`type-chip ${profile.types.includes(id) ? "selected" : ""}`}
            onClick={() =>
              onChoose
                ? onChoose(id)
                : setProfile({ types: toggle(profile.types, id) })
            }
          >
            <Icon size={22} />
            {c[id]}
          </button>
        );
      })}
    </div>
  );
}
export function PageIntro({
  locale,
  title,
  description,
  back,
}: {
  locale: Locale;
  title: string;
  description?: string;
  back?: string;
}) {
  return (
    <div className="page-intro">
      {back !== undefined ? (
        <Link href={`/${locale}/${back}`} className="back-link">
          <ArrowLeft size={17} />
          {copy(locale).back}
        </Link>
      ) : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
