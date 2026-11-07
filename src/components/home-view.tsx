"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Search,
  Compass,
  Leaf,
} from "lucide-react";
import type { Locale, Place, Region, PlaceType } from "@/lib/types";
import { regions } from "@/lib/types";
import { copy, regionImages } from "@/messages/ui";
import { designCopy } from "@/messages/design";
import { useTravelStore } from "@/hooks/use-travel-store";
import { CompanionPicker, DemoNotice } from "./common";
import { PlaceCard } from "./place-card";
import { CatalogNotice } from "./catalog-notice";
import { getPlaceFeatures } from "@/lib/place-features";
import { FeatureIcon } from "./feature-icon";

export function HomeView({
  locale,
  places,
}: {
  locale: Locale;
  places: Place[];
}) {
  const c = copy(locale),
    d = designCopy(locale),
    router = useRouter();
  const { profile, setProfile } = useTravelStore();
  const featured = (["restaurant", "cafe", "stay"] as const)
    .map(
      (type) =>
        places
          .filter((place) => place.type === type)
          .map((place) => ({
            place,
            score: getPlaceFeatures(place).reduce(
              (score, feature) =>
                score +
                (feature.status === "yes"
                  ? 2
                  : feature.status === "conditional"
                    ? 1
                    : 0),
              0,
            ),
          }))
          .sort((a, b) => b.score - a.score)[0]?.place,
    )
    .filter((place): place is Place => Boolean(place));
  return (
    <main className="home-page">
      <section className="escape-hero">
        <Image
          src="/assets/images/region-west.webp"
          alt={c.heroCaption}
          fill
          priority
          sizes="100vw"
          className="escape-image"
        />
        <div className="escape-shade" />
        <div className="escape-copy">
          <span className="eyebrow light">
            <span /> JEJU, AT OUR OWN PACE
          </span>
          <h1>
            {c.heroFirst}
            <br />
            {c.heroSecond}
          </h1>
          <p>{c.heroCopy}</p>
          <Link className="btn coral" href={`/${locale}/plan`}>
            {d.start}
            <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="hero-coordinate">
          <Compass size={20} />
          <span>
            33° N · 126° E<br />
            <strong>JEJU ISLAND</strong>
          </span>
        </div>
        <span className="hero-art-note">{c.illustration}</span>
        <section
          className="hero-companion-panel"
          aria-labelledby="hero-companion-title"
        >
          <span className="eyebrow">OUR PEOPLE, OUR JEJU</span>
          <h2 id="hero-companion-title">{c.withWho}</h2>
          <CompanionPicker locale={locale} />
          <p>{d.collectionNote}</p>
        </section>
        <form
          className="journey-search"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(`/${locale}/results`);
          }}
        >
          <label className="journey-field">
            <MapPin size={21} />
            <span>
              <small>{d.destination}</small>
              <select
                aria-label={d.destination}
                value={profile.regions.length === 1 ? profile.regions[0] : ""}
                onChange={(e) =>
                  setProfile({
                    regions: e.target.value ? [e.target.value as Region] : [],
                  })
                }
              >
                <option value="">{c.allRegions}</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {c[r]}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="journey-field category-field">
            <Compass size={21} />
            <span>
              <small>{d.category}</small>
              <select
                aria-label={d.category}
                value={profile.types.length === 1 ? profile.types[0] : ""}
                onChange={(e) =>
                  setProfile({
                    types: e.target.value ? [e.target.value as PlaceType] : [],
                  })
                }
              >
                <option value="">{c.allTypes}</option>
                {(["restaurant", "cafe", "stay"] as const).map((type) => (
                  <option key={type} value={type}>
                    {c[type]}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <button className="btn primary search-submit" type="submit">
            <Search size={19} />
            {c.navExplore}
          </button>
        </form>
      </section>
      <div className="home-content">
        <section className="travel-values" aria-label={d.together}>
          <p>{d.together}</p>
          <span>
            <FeatureIcon feature="kids" size={44} />
            {d.kidsNote}
          </span>
          <span>
            <FeatureIcon feature="pet" size={44} />
            {d.petNote}
          </span>
          <span>
            <FeatureIcon feature="senior" size={44} />
            {d.seniorNote}
          </span>
        </section>
        {places.some((p) => p.dataMode === "demo") && (
          <DemoNotice locale={locale} />
        )}
        <section className="destination-section">
          <div className="destination-intro">
            <span className="eyebrow">FIND YOUR JEJU</span>
            <h2>{d.regionTitle}</h2>
            <p>{d.regionNote}</p>
            <Link
              href={`/${locale}/results`}
              className="round-link"
              aria-label={c.viewAll}
            >
              <ArrowRight size={23} />
            </Link>
          </div>
          <div className="destination-cards">
            {regions.map((region, index) => (
              <button
                type="button"
                key={region}
                className="destination-card"
                onClick={() => {
                  setProfile({ regions: [region] });
                  router.push(`/${locale}/results`);
                }}
              >
                <Image
                  src={`/assets/images/${regionImages[region]}.webp`}
                  alt=""
                  fill
                  sizes="(max-width:700px) 65vw, 260px"
                />
                <span className="destination-shade" />
                <span className="destination-number">0{index + 1}</span>
                <span className="destination-arrow">
                  <ArrowUpRight size={20} />
                </span>
                <span className="destination-caption">
                  <strong>{c[region]}</strong>
                  <small>{c[`${region}Sub`]}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="editorial-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE LITTLE STOPS THAT MATTER</span>
              <h2>{d.collection}</h2>
              <p>{d.collectionNote}</p>
            </div>
            <Link className="text-link" href={`/${locale}/results`}>
              {c.viewAll}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="place-grid">
            {featured.map((place) => (
              <PlaceCard key={place.id} place={place} locale={locale} />
            ))}
          </div>
          <CatalogNotice locale={locale} places={places} />
        </section>
        <section className="together-banner">
          <div>
            <Leaf size={27} />
            <span className="eyebrow">A LITTLE SLOWER, A LITTLE CLOSER</span>
            <h2>{d.together}</h2>
            <p>{d.togetherCopy}</p>
            <Link className="btn primary" href={`/${locale}/plan`}>
              {d.start}
              <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="together-image">
            <Image
              src="/assets/images/hero-family.webp"
              alt={c.heroCaption}
              fill
              sizes="(max-width:700px) 90vw, 520px"
            />
            <span className="hero-art-note">{c.illustration}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
