"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Heart, Check } from "lucide-react";
import type { Locale, Place } from "@/lib/types";
import { copy } from "@/messages/ui";
import { useTravelStore } from "@/hooks/use-travel-store";
import {
  CompanionPicker,
  RegionPicker,
  TypePicker,
  DemoNotice,
} from "./common";
import { PlaceCard } from "./place-card";
export function HomeView({
  locale,
  places,
}: {
  locale: Locale;
  places: Place[];
}) {
  const c = copy(locale),
    router = useRouter(),
    { profile, setProfile } = useTravelStore();
  return (
    <main className="home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow">
            <span />
            {c.eyebrow}
          </div>
          <h1>
            {c.heroFirst}
            <br />
            <em>{c.heroSecond}</em>
          </h1>
          <p className="hero-description">{c.heroCopy}</p>
          <div className="hero-selection">
            <div className="section-mini">
              <strong>{c.withWho}</strong>
              <span>{c.multiple}</span>
            </div>
            <CompanionPicker locale={locale} />
            <button
              disabled={profile.companions.length === 0}
              className="btn primary hero-cta"
              onClick={() => router.push(`/${locale}/plan`)}
            >
              {c.findFit}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/assets/images/hero-family.webp"
            alt={c.heroCaption}
            fill
            priority
            sizes="(max-width:700px) 95vw, 560px"
          />
          <div className="hero-visual-heading">
            <span>JEJU, TOGETHER</span>
            <p>{c.heroCaption}</p>
          </div>
          <span className="ai-caption">{c.illustration}</span>
          <div className="hero-floating">
            <span className="floating-icon">
              <Heart size={23} />
            </span>
            <div>
              <strong>{c.heroBadge}</strong>
              <p>
                <Check size={13} />
                {c.kids} · {c.pet} · {c.senior}
              </p>
            </div>
          </div>
        </div>
        <Image
          className="hero-tangerine"
          src="/assets/images/decor-tangerine.webp"
          width={170}
          height={114}
          alt=""
        />
      </section>
      <div className="home-content">
        {places.some((p) => p.dataMode === "demo") && (
          <DemoNotice locale={locale} />
        )}
        <section className="home-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPLORE JEJU</span>
              <h2>{c.where}</h2>
              <p>{c.regionCopy}</p>
            </div>
            <Link className="text-link" href={`/${locale}/results`}>
              {c.viewAll}
              <ArrowRight size={17} />
            </Link>
          </div>
          <RegionPicker
            locale={locale}
            onChoose={(region) => {
              setProfile({ regions: [region] });
              router.push(`/${locale}/results`);
            }}
          />
        </section>
        <section className="home-section type-section">
          <h2>{c.what}</h2>
          <TypePicker
            locale={locale}
            onChoose={(type) => {
              setProfile({ types: [type] });
              router.push(`/${locale}/results`);
            }}
          />
        </section>
        <section className="home-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                <Sparkles size={14} /> SLOW DAYS, GOOD MEMORIES
              </span>
              <h2>{c.curated}</h2>
              <p>{c.curatedCopy}</p>
            </div>
          </div>
          <div className="place-grid">
            {places
              .filter((p) => p.price.amount !== null)
              .slice(0, 3)
              .map((place) => (
                <PlaceCard key={place.id} place={place} locale={locale} />
              ))}
          </div>
        </section>
        <section className="trust-banner">
          <Image
            src="/assets/images/decor-hareubang.webp"
            width={95}
            height={143}
            alt=""
          />
          <div>
            <h2>{c.trustTitle}</h2>
            <p>{c.trustCopy}</p>
          </div>
          <Link
            href={`/${locale}/about`}
            className="icon-button"
            aria-label={c.about}
          >
            <ArrowRight size={22} />
          </Link>
        </section>
      </div>
    </main>
  );
}
