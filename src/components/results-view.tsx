"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Map,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import type { Locale, Place, CatalogOptions } from "@/lib/types";
import { companions, regions } from "@/lib/types";
import { copy } from "@/messages/ui";
import { filterAndSortPlaces } from "@/lib/catalog";
import { useTravelStore } from "@/hooks/use-travel-store";
import { PlaceCard } from "./place-card";
import { DemoNotice, PageIntro, TypePicker, toggle } from "./common";
import { BudgetFields, NeedFields } from "./plan-view";
import { JejuMap } from "./jeju-map";
import { CatalogNotice } from "./catalog-notice";
import { catalogCopy } from "@/messages/catalog";
import {
  companionKeys,
  featureGroups,
  featureKeys,
  getPlaceFeatures,
  type FeatureKey,
} from "@/lib/place-features";
import { featureLabels } from "@/messages/features";
import { featureUi } from "@/messages/feature-ui";
import { FeatureIcon } from "./feature-icon";
export function ResultsView({
  locale,
  places,
}: {
  locale: Locale;
  places: Place[];
}) {
  const c = copy(locale),
    { profile, setProfile } = useTravelStore();
  const f = featureUi(locale);
  const [features, setFeatures] = useState<FeatureKey[]>([]);
  const [includeConditionalFeatures, setConditionalFeatures] = useState(true);
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState<CatalogOptions["sort"]>("recommended"),
    [view, setView] = useState<"list" | "map">("list"),
    [filters, setFilters] = useState(false),
    [includeUnknown, setUnknown] = useState(true),
    [includeNotFit, setNotFit] = useState(false);
  const matches = useMemo(
    () =>
      filterAndSortPlaces(places, profile, {
        query,
        sort,
        locale,
        includeUnknown,
        includeNotFit,
        features,
        includeConditionalFeatures,
      }),
    [
      places,
      profile,
      query,
      sort,
      locale,
      includeUnknown,
      includeNotFit,
      features,
      includeConditionalFeatures,
    ],
  );
  const featureCounts = useMemo(() => {
    const counts = Object.fromEntries(
      featureKeys.map((key) => [key, 0]),
    ) as Record<FeatureKey, number>;
    for (const { place } of matches) {
      for (const feature of getPlaceFeatures(place)) {
        if (
          feature.status === "yes" ||
          (includeConditionalFeatures && feature.status === "conditional")
        )
          counts[feature.key] += 1;
      }
    }
    return counts;
  }, [matches, includeConditionalFeatures]);
  return (
    <main className="page results-page">
      <PageIntro
        locale={locale}
        title={c.resultsTitle}
        description={c.resultsCopy}
      />
      {places.some((p) => p.dataMode === "demo") && (
        <DemoNotice locale={locale} />
      )}
      <CatalogNotice locale={locale} places={places} />
      <div className="search-bar">
        <Search size={21} />
        <input
          aria-label={c.searchPlaceholder}
          placeholder={c.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className={`btn ${filters ? "primary" : "secondary"}`}
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={18} />
          {c.filter}
        </button>
      </div>
      <section className="feature-filter-panel" aria-label={f.filter}>
        <div className="feature-filter-heading">
          <div>
            <h2>{f.filter}</h2>
            <p>{f.filterNote}</p>
          </div>
          {features.length > 0 && (
            <button className="feature-clear" onClick={() => setFeatures([])}>
              {f.all}
            </button>
          )}
        </div>
        <label className="check-option feature-conditional-toggle">
          <input
            type="checkbox"
            checked={includeConditionalFeatures}
            onChange={(event) => setConditionalFeatures(event.target.checked)}
          />
          {f.includeConditional}
        </label>
        <div className="companion-filters">
          {companionKeys.map((key) => (
            <button
              key={key}
              type="button"
              className={`feature-filter companion-filter companion-${key}`}
              aria-pressed={features.includes(key)}
              onClick={() => setFeatures((current) => toggle(current, key))}
            >
              <FeatureIcon feature={key} size={80} />
              <span>{featureLabels[key][locale]}</span>
              <small>
                {featureCounts[key]} {c.countSuffix}
              </small>
            </button>
          ))}
        </div>
        {(Object.keys(featureGroups) as (keyof typeof featureGroups)[]).map(
          (group) => (
            <div key={group} className="facility-filter-group">
              <h3>{f.groupFilter[group]}</h3>
              <div className="feature-filters">
                {featureGroups[group].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="feature-filter"
                    aria-pressed={features.includes(key)}
                    onClick={() =>
                      setFeatures((current) => toggle(current, key))
                    }
                  >
                    <FeatureIcon feature={key} size={32} />
                    <span>{featureLabels[key][locale]}</span>
                    <small>
                      {featureCounts[key]} {c.countSuffix}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          ),
        )}
      </section>
      <div className="region-tabs">
        <button
          className={!profile.regions.length ? "active" : ""}
          onClick={() => setProfile({ regions: [] })}
        >
          {c.allRegions}
        </button>
        {regions.map((r) => (
          <button
            key={r}
            className={profile.regions.includes(r) ? "active" : ""}
            aria-pressed={profile.regions.includes(r)}
            onClick={() => setProfile({ regions: toggle(profile.regions, r) })}
          >
            {c[r]}
          </button>
        ))}
      </div>
      <TypePicker locale={locale} />
      <div
        className="catalog-tag-filters"
        aria-label={catalogCopy(locale).sourceTags}
      >
        {[...new Set(places.flatMap((p) => p.sourceTags ?? []))]
          .filter((tag) =>
            [
              "고기국수",
              "흑돼지",
              "해산물",
              "오션뷰",
              "커피",
              "리조트",
              "호텔",
              "반려동물",
              "가족",
            ].includes(tag),
          )
          .map((tag) => (
            <button
              key={tag}
              className={query === tag ? "active" : ""}
              aria-pressed={query === tag}
              onClick={() => setQuery(query === tag ? "" : tag)}
            >
              #{tag}
            </button>
          ))}
      </div>
      {filters && (
        <section className="panel filter-panel">
          <div className="filter-companions">
            <strong>{c.withWho}</strong>
            {companions.map((id) => (
              <label className="check-option" key={id}>
                <input
                  type="checkbox"
                  checked={profile.companions.includes(id)}
                  onChange={() =>
                    setProfile({ companions: toggle(profile.companions, id) })
                  }
                />
                {c[id]}
              </label>
            ))}
          </div>
          <NeedFields locale={locale} />
          <div>
            <h3>{c.budget}</h3>
            <p className="muted">{c.budgetCopy}</p>
            <BudgetFields locale={locale} />
          </div>
          <div className="filter-includes">
            <label className="check-option">
              <input
                type="checkbox"
                checked={includeUnknown}
                onChange={(e) => setUnknown(e.target.checked)}
              />
              {c.showUnknown}
            </label>
            <label className="check-option">
              <input
                type="checkbox"
                checked={includeNotFit}
                onChange={(e) => setNotFit(e.target.checked)}
              />
              {c.showNotFit}
            </label>
          </div>
        </section>
      )}
      <div className="results-toolbar">
        <div className="result-total" aria-live="polite">
          <strong>{matches.length}</strong> {c.countSuffix}
          <span>{profile.companions.map((p) => c[p]).join(" · ")}</span>
        </div>
        <div className="results-actions">
          <select
            aria-label={c.recommended}
            value={sort}
            onChange={(e) => setSort(e.target.value as CatalogOptions["sort"])}
          >
            <option value="recommended">{c.recommended}</option>
            <option value="price">{c.priceSort}</option>
            <option value="duration">{c.durationSort}</option>
            <option value="name">{c.nameSort}</option>
          </select>
          <div className="view-toggle">
            <button
              aria-pressed={view === "list"}
              aria-label={c.list}
              onClick={() => setView("list")}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              aria-pressed={view === "map"}
              aria-label={c.map}
              onClick={() => setView("map")}
            >
              <Map size={18} />
            </button>
          </div>
        </div>
      </div>
      {!matches.length ? (
        <div className="empty-state">
          <Search size={38} />
          <h2>{features.length ? f.empty : c.noResults}</h2>
          <p>{features.length ? f.emptyNote : c.noResultsCopy}</p>
          <button
            className="btn secondary"
            onClick={() => {
              if (features.length) setFeatures([]);
              else setProfile({ regions: [], budgets: {}, types: [] });
              setQuery("");
            }}
          >
            <RotateCcw size={17} />
            {features.length ? f.all : c.resetArea}
          </button>
        </div>
      ) : view === "map" ? (
        <JejuMap locale={locale} places={matches.map((m) => m.place)} />
      ) : (
        <div className="place-grid">
          {matches.map(({ place }) => (
            <PlaceCard key={place.id} place={place} locale={locale} />
          ))}
        </div>
      )}
      <div className="results-end">
        <Link href={`/${locale}/saved`} className="text-link">
          {c.navSaved}
          <ArrowRight size={18} />
        </Link>
      </div>
    </main>
  );
}
