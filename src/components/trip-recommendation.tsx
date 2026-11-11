"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BedDouble, Check, MapPin, Sparkles } from "lucide-react";
import type { Locale, Place, Region } from "@/lib/types";
import { recommendSavedTrip } from "@/lib/trip/recommend";
import { useTravelStore } from "@/hooks/use-travel-store";
import { copy } from "@/messages/ui";
import { recommendationCopy, tripLengthLabel } from "@/messages/recommendation";
import { browseCategory } from "@/lib/place-categories";
import { typeIcons } from "./common";
import { AutoTripPlanner } from "./auto-trip-planner";
import styles from "./trip-recommendation.module.css";

export function TripRecommendation({ places, locale }: { places: Place[]; locale: Locale }) {
  const store = useTravelStore();
  const c = copy(locale), t = recommendationCopy(locale);
  const [preference, setPreference] = useState("");
  const [aiResult, setAiResult] = useState<{ key: string; order: Region[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<"unsupported" | "failed" | null>(null);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const savedCatalogKey = JSON.stringify(places.filter((place) => store.savedIds.includes(place.id)).map((place) => [
    place.id, place.region, place.type, place.name.ko, place.dataMode, place.facts, place.price,
  ]));
  const inputKey = JSON.stringify([store.savedIds, store.profile, store.tripDays, preference, savedCatalogKey]);
  const usingAi = aiResult?.key === inputKey;
  const regionOrder = usingAi ? aiResult.order : undefined;
  const recommendation = useMemo(() => recommendSavedTrip({
    places, savedIds: store.savedIds, profile: store.profile,
    nights: Math.max(1, store.tripDays - 1), options: { preferredRegionOrder: regionOrder },
  }), [places, store.savedIds, store.profile, store.tripDays, regionOrder]);
  const byId = new Map(places.map((place) => [place.id, place]));
  const draftKey = JSON.stringify([inputKey, recommendation.itinerary, regionOrder]);
  const hasStops = Object.values(recommendation.itinerary).some((ids) => ids.length > 0);
  const recommendedOvernights = Object.fromEntries(recommendation.days
    .filter((day) => day.day <= recommendation.nights && day.stayRegion !== null)
    .map((day) => [String(day.day), { region: day.stayRegion, placeId: day.stayPlaceId }]));
  const isApplied = appliedKey === draftKey && store.tripDays === recommendation.tripDays
    && JSON.stringify(store.itinerary) === JSON.stringify(recommendation.itinerary)
    && JSON.stringify(store.overnightByDay ?? {}) === JSON.stringify(recommendedOvernights);

  useEffect(() => () => controller.current?.abort(), [inputKey]);

  async function runAi() {
    if (busy) return;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setBusy(true); setProgress(0); setError(null);
    try {
      const { rankRegionsInBrowser } = await import("@/lib/trip/browser-ai");
      const allowed = [...new Set(recommendation.days.flatMap((day) => day.region ? [day.region] : []))];
      const excluded = new Set(recommendation.excluded.map(({ placeId }) => placeId));
      const saved = new Set(store.savedIds);
      const candidates = allowed.map((region) => {
        const regionPlaces = places.filter((place) => place.region === region && saved.has(place.id) && !excluded.has(place.id));
        return { region, names: regionPlaces.map((place) => place.name.ko), categories: [...new Set(regionPlaces.map((place) => browseCategory(place.type)))], hasStay: regionPlaces.some((place) => place.type === "stay") };
      });
      const order = await rankRegionsInBrowser(candidates, store.profile.companions, preference, {
        signal: nextController.signal,
        onProgress: (value) => { if (!nextController.signal.aborted && controller.current === nextController) setProgress(value); },
      });
      if (!nextController.signal.aborted) setAiResult({ key: inputKey, order });
    } catch (failure) {
      if (!nextController.signal.aborted) {
        const code = failure && typeof failure === "object" && "code" in failure ? failure.code : null;
        setError(code === "unsupported" ? "unsupported" : "failed");
      }
    } finally { if (controller.current === nextController) setBusy(false); }
  }

  return <section className={styles.panel} aria-labelledby="trip-recommendation-title">
    <div className={styles.heading}>
      <div><span className="eyebrow">YOUR PLACES, YOUR JOURNEY</span><h2 id="trip-recommendation-title">{t.title}</h2><p>{t.intro}</p></div>
      <span className={styles.length}>{tripLengthLabel(locale, store.tripDays)}</span>
    </div>
    <AutoTripPlanner places={places} locale={locale} />
    {!store.savedIds.length ? <p>{t.noPlaces} <Link href={`/${locale}/results`} className="text-link">{t.browse}<ArrowRight size={16} /></Link></p>
      : store.tripDays < 2 ? <p>{t.nightsOnly}</p> : <>
        <div className={styles.aiControls}>
          <label>{t.preference}<input maxLength={240} value={preference} disabled={busy} onChange={(event) => setPreference(event.target.value)} placeholder={t.placeholder} /></label>
          <button className="btn secondary" type="button" disabled={busy || !hasStops} onClick={runAi}><Sparkles size={18} />{t.aiButton}</button>
        </div>
        <p className={styles.aiNote}>{t.aiNotice}</p>
        {busy && <div className={styles.progress} role="status"><span>{progress >= 1 ? t.thinking : `${t.loading} ${Math.round(progress * 100)}%`}</span><progress max={1} value={progress} /><button type="button" className="text-link" onClick={() => controller.current?.abort()}>{t.cancel}</button></div>}
        {error && <p className={styles.warning} role="status">{t[error]}</p>}
        <p className={styles.method}><Sparkles size={16} />{usingAi ? t.ai : t.rules}</p>
        <div className={styles.days}>
          {recommendation.days.map((day) => {
            const stay = day.stayPlaceId ? byId.get(day.stayPlaceId) : null;
            return <article key={day.day} className={styles.day}>
              <header><span>DAY {String(day.day).padStart(2, "0")}</span><h3><MapPin size={20} />{day.region ? c[day.region] : c.allRegions}</h3></header>
              {day.stops.length ? <ol>{day.stops.map(({ place, evaluation }) => {
                const Icon = typeIcons[place.type];
                return <li key={place.id}><Icon size={19} /><div><small>{c[browseCategory(place.type)]}</small><Link href={`/${locale}/places/${place.slug}`}>{place.name[locale]}</Link>{evaluation.verdict !== "fit" && <span className={styles.condition}>{t.confirm}</span>}</div></li>;
              })}</ol> : <p className={styles.empty}>{t.noStops}</p>}
              {day.day <= recommendation.nights && <div className={styles.stay}><BedDouble size={23} /><div><small>{day.day}{t.nights} · {t.stay}</small><strong>{day.stayRegion ? c[day.stayRegion] : c.allRegions}</strong>{stay ? <Link href={`/${locale}/places/${stay.slug}`}>{stay.name[locale]}</Link> : <Link href={`/${locale}/results`} onClick={() => store.setProfile({ types: ["stay"], regions: day.stayRegion ? [day.stayRegion] : [] })}>{t.noStay}<ArrowRight size={14} /></Link>}</div></div>}
            </article>;
          })}
        </div>
        <div className={styles.notes}>
          {recommendation.missingTypes.length > 0 && <p><strong>{t.missing}</strong> {recommendation.missingTypes.map((type) => c[type]).join(" · ")}</p>}
          {recommendation.excluded.length > 0 && <details><summary>{t.excluded} · {recommendation.excluded.length}</summary><ul>{recommendation.excluded.map(({ placeId }) => <li key={placeId}>{byId.get(placeId)?.name[locale] ?? placeId}</li>)}</ul></details>}
          {recommendation.unassignedIds.length > 0 && <details><summary>{t.unassigned} · {recommendation.unassignedIds.length}</summary><ul>{recommendation.unassignedIds.map((id) => <li key={id}>{byId.get(id)?.name[locale] ?? id}</li>)}</ul></details>}
          <p>{t.routeNote}</p>
        </div>
        <div className={styles.actions}><div><button type="button" className="btn primary" disabled={!hasStops || busy} onClick={() => { if (store.applyRecommendedTrip(recommendation)) setAppliedKey(draftKey); }}><Check size={18} />{t.apply}</button>{Object.values(store.itinerary).some((ids) => ids.length) && <small>{t.replace}</small>}</div>{isApplied && <span role="status"><Check size={17} />{t.applied}</span>}</div>
      </>}
  </section>;
}
